# Fight EVO — Game Design Document

> Combat mechanics, combo system, mutation catalog, boss fights, and wave progression.

---

## 1. Combat System Overview

Combat is skeleton-based. Every attack creates hitboxes anchored to specific bones. Every body part has a hurtbox tracking its bone. Where a hit lands matters — hitting a head deals 2x damage and 3x knockback. Hitting a knee can dislocate it. Limbs break. Fighters keep going with whatever's left.

Attacks and blocks are contextual: the same key (J, K, L) produces different moves depending on whether the fighter is standing, crouching, sliding, airborne, dashing, or wall-jumping. The combo system chains attacks through an input buffer with timing windows.

### Fighter State Machine (`StateManager.js`)

```
IDLE ──────→ WALKING (directional held)
IDLE ──────→ ATTACKING (move resolved from combo system)
IDLE ──────→ JUMPING (W pressed)
IDLE ──────→ CROUCHING (S held)
IDLE ──────→ BLOCKING (L held)
IDLE ──────→ DASHING (Space pressed)

WALKING ───→ SLIDING (S pressed while walking)
WALKING ───→ JUMPING (W pressed, preserves horizontal momentum)
WALKING ───→ ATTACKING (J/K pressed)

CROUCHING ─→ IDLE (release S)
CROUCHING ─→ ATTACKING (J = uppercut, K = sweep)

ATTACKING ──→ IDLE (recovery complete)
ATTACKING ──→ ATTACKING (combo chain — next move in buffer)
ATTACKING ──→ HIT_STUN (hit during recovery)

JUMPING ───→ RISING → FALLING (normal arc)
             RISING → FLOATING (hold W)
             FALLING → FAST_FALLING (press S)
             FLOATING → FAST_FALLING (press S overrides W)
             FAST_FALLING → FLOATING (press W overrides S)
             Any air state → AIR_ATTACKING (J/K)
             Any air state → DASHING_AIR (Space)
             Any air state → LANDING (ground contact)

HIT_STUN ──→ IDLE (stun expired)
HIT_STUN ──→ KNOCKDOWN (hit during stun / launcher)

KNOCKDOWN ─→ GETTING_UP → IDLE (invincible during getup)

BLOCKING ──→ BLOCK_STUN (hit while blocking)
BLOCKING ──→ CROUCH_BLOCK (S pressed while blocking)

WALL_SLIDING → WALL_JUMPING (W pressed)
WALL_SLIDING → FALLING (release direction / S pressed)
WALL_SLIDING → WALL_DASH (Space pressed)

INJURED STATES (overlays):
  LEG_INJURED:    -30% move speed, -50% jump, limp blended into walk
  LEG_DESTROYED:  -60% move speed, no jump, drag animation
  NO_LEGS:        collapse to ground, crawl at 10% speed, arms only
  ARM_INJURED:    lose that arm's attacks and block side
  SPINE_BROKEN:   -50% everything, constant HP drain (2/sec)
  NECK_BROKEN:    head ragdolls, +50% hitstun duration
```

### Move Data Format (`MoveSet.js`)

Every move is a data object:

```javascript
{
    name: 'dropkick',
    animation: 'kick_dropkick',
    startup: 8,                  // frames before hitbox active
    active: 6,                   // frames hitbox is out
    recovery: 6,                 // frames vulnerable after hitbox
    damage: 25,
    knockback: { x: 12, y: -6 },
    hitstun: 15,                 // frames opponent is stunned
    attackHeight: 'mid',         // 'high', 'mid', 'low'
    hitboxes: [
        {
            bone: 'shinR',
            localOffset: { x: 0.5, y: 0 },
            width: 1.4,          // relative to bone length
            height: 0.8,
            activeStart: 8,
            activeEnd: 14,
        }
    ],
    requiresAirborne: false,
    comboStep: null,              // or 'chain2', 'finisher', etc.
    priority: 3,                  // wins trades against lower priority
    canHitLow: false,
    canHitHigh: true,
    structuralBonusMult: 1.0,     // some moves do extra structural damage
}
```

---

## 2. Combo System (`ComboSystem.js`)

### Combo Buffer

```javascript
COMBO_BUFFER = {
    maxSize: 8,
    windowMs: 600,              // inputs older than 600ms expire
    chainWindowFrames: 12,      // frames after active ends to chain next hit
};

// Buffer tracks: { action: 'punch'|'kick', direction: 'forward'|'back'|'up'|'down'|'neutral', frame }
// Direction is relative to FACING (not absolute left/right)
```

### Ground Combos

```
STANDING (IDLE or WALKING):
  J                 → Jab (3f startup, fast)
  J → J             → Jab → Cross (1-2 punch)
  J → J → J         → Jab → Cross → Hook (3-hit finisher)
  J → J → K         → Jab → Cross → Roundhouse kick (finisher)
  J → K             → Jab → Side kick
  K                 → Front kick (5f startup, good range)
  K → K             → Front kick → High kick
  K → J             → Front kick → Body blow
  K → K → K         → Front kick → High kick → Spin kick (finisher)

DIRECTIONAL MODIFIERS (during chain):
  S + J             → Low punch (hits low, must block low)
  S + K             → Sweep (trips, must block low)
  W + J             → Uppercut (launches opponent)
  W + K             → Axe kick (overhead, must block standing)

CROUCHING:
  J                 → Uppercut (6f startup, launches)
  K                 → Sweep (trips, hits low)
  J → J             → Uppercut → Overhead smash

SLIDING:
  J                 → Slide punch (low hit, carries momentum)
  K                 → Slide kick (long range, trips)

DASHING (Space then attack):
  Space → J         → Dash punch (high damage, inherits dash speed)
  Space → K         → Dash kick (flying kick, big commitment)
  Space → S + J     → Dash → Slide punch
  Space → S + K     → Dash → Slide kick
```

### Air Combos

```
AIRBORNE:
  J                 → Air jab (angled based on trajectory)
  J → J             → Air jab → Air cross
  K                 → Air kick (angled slightly down)
  J → K             → Air jab → Air kick (launcher extender)
  K → S + K         → Air kick → Stomp (spike downward)

FAST FALLING:
  J                 → Diving punch (extra damage from speed)
  K                 → Stomp (drives opponent down, spike move)

AIR DASHING:
  Space → J         → Dash punch (aerial)
  Space → K         → Dropkick (full-body horizontal kick, huge hitbox, heavy recovery)

WALL JUMP:
  J                 → Wall jump punch (away from wall)
  K                 → Wall jump kick (follows trajectory)
  S + K             → Diving kick (angled downward)
  W + K             → Rising kick (angled upward)
```

### Combo Damage Scaling

```javascript
COMBO_SCALING = {
    hit1: 1.0,    hit2: 0.9,    hit3: 0.8,
    hit4: 0.7,    hit5: 0.6,    hit6Plus: 0.5,

    // CRITICAL: Structural damage does NOT scale
    // Every hit in a combo does full structural damage
    // Long combos are the best way to break limbs
    structuralScaling: false,
};
```

---

## 3. Block System

Three block types with different coverage:

```
Standing Block (L):         Crouch Block (S + L):       Air Block (L in air):
  Blocks: HIGH, MID          Blocks: MID, LOW            Blocks: ALL directions
  Misses: LOW                Misses: HIGH, Overheads     50% damage reduction
  80% damage reduction       80% damage reduction        Full knockback received
  80% knockback reduction    80% knockback reduction     Negates structural damage
  Negates structural dmg     Negates structural dmg
  Can slow-walk (50%)        Cannot move

CANNOT block during:
  Sliding, attacking, dashing, wall sliding, fast falling, air dashing
  This is core risk/reward — committed actions are vulnerable
```

---

## 4. Wall Combat

Wall mechanics serve combat, not just movement. They're the primary way to reach a Giant's head.

```
Wall Slide:    Hold direction into wall while airborne → slow descent (30% fall speed)
Wall Jump:     Press W during wall slide → launch away + up (1.2x jump force)
Wall Dash:     Press Space during wall slide → horizontal dash away (no height gain)
Fast Drop:     Press S during wall slide → release wall, fall at 2.5x speed

Triangle Jump: Alternate wall jumps between two walls to gain height
               Each jump is 85% height of the previous (chain decay)
               Max 5 chained wall jumps before ground reset needed
               Enough height to clear a Giant's head

Wall Jump Attacks:
  After wall jump, enhanced aerial options with momentum bonuses
  Diving kick (S+K): diagonal down, 1.5x damage
  Dropkick (forward+K): horizontal, 1.8x damage, heavy recovery on miss
  Rising uppercut (W+J): upward arc, 1.3x damage, launches opponent
```

---

## 5. Mutation System

### How Mutations Work

Body mutations are **visible, physical changes** to enemy skeletons and stats. They're separate from NEAT (brain) evolution. NEAT evolves how enemies think. Mutations evolve what they are.

Mutations are assigned at spawn time. Living enemies are never modified. New mutation tiers unlock at wave boundaries.

### Trait Axis System (`TraitSystem.js`)

Every stat buff has a proportional cost, enforced through five interconnected axes:

```
AXIS 1: Mass ←→ Speed
  Heavy: high mass, slow, high KB resist, slow attacks, high base damage
  Light: low mass, fast, low KB resist, fast attacks, low damage

AXIS 2: Armor ←→ Agility
  Armored: damage reduction, slower, longer recovery, reduced KB, no dash
  Agile:   no DR, faster, shorter recovery, full KB, has dash

AXIS 3: Size ←→ Precision
  Big:   larger hit/hurtboxes, higher damage, slower startup, more HP
  Small: tiny hit/hurtboxes, lower damage, quick startup, less HP

AXIS 4: Complexity ←→ Stability
  Complex: more sensors/outputs, more attacks, larger hurtbox surface, harder to evolve
  Simple:  base I/O, fewer moves, compact, evolves quickly

AXIS 5: Density ←→ Fragility
  Dense:   high structural HP, strong joints, heavier, bones resist breaking
  Fragile: low structural HP, weak joints, lighter, bones snap easily
```

Each mutation declares axis shifts. Stacked mutations sum their shifts (clamped to ±1.5). All derived stats flow from axis positions through `TraitSystem.computeStats()`. Stat multipliers multiply (not add) when stacking.

### Mutation Catalog

#### Tier 1 — Minor (Wave 3+)

**LONG_ARMS**: Upper/forearm bones 1.3–1.4x length. 30% more reach, 10% slower swing. Hurtboxes also extend (bigger target on arms). Lever physics: hits at the tip of long arms stress the elbow joint more.

**HEAVY_LEGS**: Thigh/shin bones 1.1–1.2x, visually thicker. 30% more kick damage, 15% slower movement, harder to push around. Landing from a jump creates a micro-shockwave hitbox.

**QUICK_TWITCH**: No bone changes. 30% faster movement, 20% faster attacks, 30% less HP, 15% less damage. Bones are fragile (50% structural HP). Faint green tint, subtle idle vibration.

**THICK_SKULL**: Head bone 1.4x, visually bigger. Head takes 50% less damage, recovers from stagger faster. Gains headbutt move (hitbox on head bone). Head-on collision knocks player back.

**TAIL**: New bone from hip. Grants rear attack. Minor complexity cost.

**SPRINGY**: Higher jumps, bounces off walls. Light, agile. Fragile.

**ASYMMETRIC**: One arm longer than the other. Different reach per side. Complexity cost from asymmetric fighting style.

#### Tier 2 — Significant (Wave 6+)

**EXTRA_ARMS**: Second pair from mid-spine. Four new bones per side. Two additional NEAT outputs (secondary punch, secondary grab). Secondary arms can attack **independently** — punch with primary while blocking with secondary, or double-punch for rapid hits. All four arms have hurtboxes (bigger target). Significant complexity cost.

**ARMORED**: No bone changes. 40% damage reduction, very slow (70% speed), 1.5x HP, nearly immovable (2.0x KB resist). Extremely dense bones (2.0x structural HP). All bones render thick, grey/metallic tint, white outline. Cannot dash.

**STRETCHY**: Normal bones at rest, but during attacks limbs visually elongate 1.8x. Huge reach during active frames, less damage, slower windup. Bones nearly unbreakable (3.0x structural HP) but joints dislocate easily (0.4x threshold). Rubber-band snap-back animation on recovery.

**BERSERKER**: Damage and speed scale dynamically as HP drops. At 10% HP: ~1.9x damage, ~1.45x speed. Cannot block at all. Red glow intensifies with missing HP, rage particle aura at low HP.

**CRAWLER**: Arms become weight-bearing. All limbs extend (forearms 1.8x, shins 1.5x). Spine compresses. Quadruped base pose — body is low to ground. Replaces walk/jump with crawl/lunge. Entirely different moveset: swipe, lunge-bite, leg sweep. Horizontal body shape in physics. Reinforced joints (1.5x strength). Spider-like scuttle animation.

**REGEN**: Slowly regenerates HP over time. Slightly slower and heavier to compensate.

**VENOMOUS**: Attacks apply damage-over-time. Small, precise. Complexity cost.

**MULTI_HEAD**: Second head bone from spine. Four additional NEAT inputs: rear threat distance/attacking, second target tracking. Effectively panoramic awareness. 50% hitstun reduction (two brains). Two independent head hurtboxes — must hit both for full head-damage multiplier. Heavier, more complex, harder to evolve.

#### Tier 3 — Dramatic (Wave 10+)

**GIANT**: All bones 1.8x scale. 3.0x HP, 1.8x damage, 50% speed, 60% attack speed. Mass 3.5x, KB resist 3.0x. Neutral bone density — big bones, same structural toughness. A Giant's shin has normal structural HP but is a much bigger target. Break the legs → the Giant topples → head becomes reachable. Footsteps create micro-hitboxes. Screen shake on land and attack.

**SPLIT**: On death, spawns 2 copies at 65% scale, 40% HP, 60% damage. Children inherit the same neural network but no body mutations. Original is lighter and has less HP (60%). Pulsating visual effect.

**MIMIC**: Clones player's skeleton proportions and color. Slightly weaker across the board. 30% chance to mirror player's idle pose with 200ms delay (uncanny). Extra NEAT inputs: player's last 3 moves (one-hot). Slightly transparent.

**VOLATILE**: Glass cannon. 50% HP, 30% more damage, 40% faster. On death: explosion with 120px radius, 30 damage, heavy screen shake. Constant spark particles, pulsation rate increases as HP drops.

**PARASITE**: 0.45x scale, 20% HP, 10% damage, 60% faster, 50% higher jumps. Extra NEAT output: attempt-latch. When close enough (25px), latches onto player's skeleton, draining 3 HP/sec. Player must input 3 directional sequences to shake off. Tiny hurtboxes — extremely hard to hit. Launched across arena by knockback due to low mass.

#### Hidden Mutation

**CARDIAC_ARREST**: 2% chance to be attached to any genome as invisible metadata. Only triggers during boss fights. Boss walks out, plays for 1-2 seconds, then: stops moving → hand to chest → staggers → drops to one knee → collapses → dies. No score, no explosion, no explanation. Genome gets -100 fitness. 50% inheritance on crossover. 0.5% spontaneous appearance rate. The only hint: a barely-visible heart icon flickers for 200ms at 40% opacity when the boss spawns.

### Mutation Stacking

```
Max mutations per enemy:
  Wave < 6:   1
  Wave < 10:  2
  Wave 10+:   3

Roll chance: 0.3 + (waveNumber × 0.04) for first, halved for each additional

Stacking: stat multipliers multiply (not add)
  LONG_ARMS (range 1.3x) + STRETCHY (range 1.8x) → final range 2.34x

Incompatible pairs (cannot co-exist):
  GIANT + PARASITE, GIANT + SPLIT, GIANT + MIMIC
  ARMORED + QUICK_TWITCH, ARMORED + VOLATILE, ARMORED + BERSERKER
  MIMIC + EXTRA_ARMS (mimic needs player skeleton)
```

### Mutation Axis Map

```javascript
// { massSpeed, armorAgility, sizePrecision, complexStable, densityFragility }
LONG_ARMS:    {  0,    0.2,  -0.2, -0.1,  0   }
HEAVY_LEGS:   { -0.4, -0.1, -0.1,  0,     0   }
QUICK_TWITCH: {  0.5,  0.3,  0.2,  0,     0.6 }
THICK_SKULL:  { -0.1, -0.2, -0.1, -0.1,   0   }
EXTRA_ARMS:   { -0.1,  0,    0,   -0.6,   0   }
ARMORED:      { -0.3, -0.8, -0.1,  0,    -0.8 }
STRETCHY:     {  0.1,  0.2, -0.3, -0.2,   0.3 }  // bones strong, joints weak
BERSERKER:    {  0.2,  0.5,  0,   -0.1,   0   }
CRAWLER:      { -0.1,  0.3, -0.2, -0.4,  -0.3 }
GIANT:        { -0.7, -0.3, -0.9,  0,     0   }  // neutral density!
SPLIT:        {  0.3,  0.2,  0.3, -0.3,   0   }
MIMIC:        {  0,    0,    0,   -0.4,   0   }
VOLATILE:     {  0.4,  0.5,  0.2, -0.1,   0   }
PARASITE:     {  0.7,  0.6,  0.8, -0.3,   0.5 }
MULTI_HEAD:   { -0.2, -0.1, -0.2, -0.5,   0   }
```

---

## 6. Wave System

Waves are **mutation gates** and **intensity ramps**. Neural evolution runs continuously on deaths, independent of waves.

### Wave Progression

```
Wave 1-2:   "LEARNING"
  1-2 enemies alive, 3s respawn delay
  No body mutations
  NEAT population is naive
  Stat multiplier: 1.0x

Wave 3-5:   "ADAPTING"
  2-3 enemies alive, 2s respawn delay
  Tier 1 mutations unlocked
  NEAT enemies approach and swing
  Stat multiplier: 1.1x–1.2x

Wave 6-9:   "THREATENING"
  3-4 enemies alive, 1.5s respawn delay
  Tier 2 mutations unlocked
  Enemies combo, block, punish
  Stat multiplier: 1.3x–1.5x

Wave 10-14: "DANGEROUS"
  4-5 enemies alive, 1s respawn delay
  Tier 3 mutations unlocked
  Enemies coordinate, read habits
  Stat multiplier: 1.6x–2.0x

Wave 15+:   "NIGHTMARE"
  5+ enemies alive, 0.5s respawn delay
  All mutations, multi-mutation enemies
  Stat multiplier: 2.0x+, uncapped
```

Waves advance on **kill count** (base 8, +2 per wave), not "clear all enemies." Enemies respawn continuously — wave transitions happen mid-fight.

### Boss Fights (Every 5 Waves)

```
Wave 5, 10, 15, 20, ... → BOSS WAVE

1. All regular enemies cleared
2. Brief dramatic pause — screen darkens, "BOSS" text
3. Boss enters: dominant genome (highest cumulative fitness)
4. Boss gets 1-3 mutations (biased toward top-performing mutations)
5. Boss has 3x HP (on top of wave scaling + mutation stats)
6. No respawns during boss fight
7. Player structural HP resets before boss fight
8. Defeating boss → bonus score, brief heal, resume waves
```

Boss visuals: 2x bone thickness, gold tint, name plate ("BOSS — Gen N"), full-width HP bar at screen top, mutation icons displayed.

---

## 7. Player-Facing Evolution Indicators

```
Visual:
  - Generation counter on HUD: "Gen 14"
  - New mutations flash icon on spawn
  - Enemy tint/glow communicates mutations
  - "NEW MUTATION" popup first time a mutation type appears in a run
  - Broken limbs visibly dangle
  - Injured enemies limp, crawl, fight one-handed

Gameplay Feel:
  - Early: enemies stumble, flail → satisfying to stomp
  - Mid:   enemies approach, combo, block → player adjusts
  - Late:  enemies dodge, punish, target weak spots → genuine challenge
  - Mutated enemies look visibly wrong → communicates danger at a glance
```
