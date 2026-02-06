# Fight EVO — Technical Specification

> NEAT evolution, structural integrity, damage pipeline, hitbox/hurtbox system,
> trait axis calculations, knockback formulas, and sensor/output schemas.

---

## 1. NEAT AI System

### Continuous Evolution Model

Evolution runs on a **death-driven loop**, not batched between waves.

```
Enemy spawns → Fights → Dies → Scored → Genome enters dead pool
                                              │
                        Dead pool hits threshold (6 deaths) → Evolve
                                              │
                        New genomes fill spawn pool → Next spawn pulls from it
```

Living enemies are **never** modified. Only the spawn pool improves. The player feels the ramp as dumb enemies die and smarter ones replace them mid-wave.

### EvolutionManager.js

```javascript
class EvolutionManager {
    population;          // Full NEAT population (40 genomes)
    deadPool = [];       // Scored genomes from killed enemies
    spawnPool = [];      // Ready-to-deploy evolved genomes
    generation = 0;
    mutationCatalog;

    // Called when an enemy dies
    reportDeath(genome, fitnessScore, bodyMutations) {
        genome.score = fitnessScore;
        this.deadPool.push({ genome, bodyMutations });

        if (this.deadPool.length >= DEAD_POOL_THRESHOLD) {
            this.evolve();
        }
    }

    // NEAT selection, crossover, mutation
    evolve() {
        // Merge dead pool scores into population
        // Run NEAT operators → new genomes fill spawnPool
        this.generation++;
        this.deadPool = [];
    }

    // Get genome + mutations for next spawn
    requestSpawn(waveNumber) {
        const genome = this.spawnPool.pop() || this.getRandomGenome();
        const bodyMuts = this.mutationCatalog.rollMutations(waveNumber, this.generation);
        return { genome, bodyMutations: bodyMuts };
    }

    // Dominant genome for boss fights
    getDominantGenome() {
        // Highest cumulative fitness across all deployments
    }
}
```

### NEAT Configuration

```javascript
NEAT_CONFIG = {
    popsize: 40,
    elitism: 6,                // Top 15% survive unchanged
    mutationRate: 0.3,
    crossoverRate: 0.5,
    // Using neataptic: new Neat(inputCount, outputCount, null, config)
    // Alternative: lightweight custom NEAT (~300 lines) if neataptic is too heavy
};
```

### Neural Network Topology

```
Base topology: inputs → outputs (no hidden nodes initially)
NEAT adds hidden nodes and connections over generations.

Mutation-variant enemies have extended topologies:
  EXTRA_ARMS:  +2 outputs (secondary_punch, secondary_grab)
  MULTI_HEAD:  +4 inputs (rear_threat_dist, rear_threat_attacking, 2nd_target_x, 2nd_target_y)
  PARASITE:    +1 output (attempt_latch), +1 input (latch_distance)
  MIMIC:       +3 inputs (player_recent_move_0, _1, _2)

Variant nodes are added to a cloned base genome with random initial weights.
NEAT handles variable topology natively.
```

---

## 2. Sensor Array (`SensorArray.js`)

### Base Inputs (20)

All values normalized to [-1, 1] or [0, 1].

```
 #   Name                        Range    Notes
 ──────────────────────────────────────────────────────────────
 0   own_hp_normalized            0–1
 1   own_facing_direction        -1/+1    -1 = left, +1 = right
 2   player_hp_normalized         0–1
 3   player_distance_x           -1–1     Signed, relative to self
 4   player_distance_y           -1–1     Negative = player above
 5   player_velocity_x           -1–1     Normalized
 6   player_velocity_y           -1–1     Normalized
 7   player_grounded              0/1
 8   player_state_attacking       0/1
 9   player_state_blocking        0/1
10   player_state_hitstun         0/1
11   player_facing_direction     -1/+1
12   own_velocity_x              -1–1
13   own_velocity_y              -1–1
14   own_grounded                 0/1
15   own_state_encoded            0–1     Idle/attacking/hitstun/blocking mapped
16   near_left_wall               0–1     1.0 = touching
17   near_right_wall              0–1     1.0 = touching
18   nearest_ally_distance_x     -1–1     Nearest other living enemy
19   nearest_ally_distance_y     -1–1     Enables flanking evolution
```

### Structural Awareness Inputs (8)

Added for all enemies so NEAT can fight around injuries:

```
20   left_leg_integrity           0–1     0 = destroyed, 1 = healthy
21   right_leg_integrity          0–1
22   left_arm_integrity           0–1
23   right_arm_integrity          0–1
24   spine_integrity              0–1
25   can_walk                     0/1
26   can_jump                     0/1
27   available_attacks_ratio      0–1     Moves remaining / total moves
```

**Total base inputs: 28** (20 environmental + 8 structural)

### Base Outputs (8)

Each output is 0–1 via sigmoid. `> 0.5` = "pressed."

```
 #   Name                Action
 ─────────────────────────────────
 0   move_left           Virtual 'A'
 1   move_right          Virtual 'D'
 2   jump                Virtual 'W'
 3   crouch              Virtual 'S'
 4   punch               Virtual 'J'
 5   kick                Virtual 'K'
 6   block               Virtual 'L'
 7   dash                Virtual 'Space'
```

AI outputs feed into the **same** InputManager / ComboSystem / StateManager as the player. No special AI actions. The network learns combos by sequencing outputs across frames.

AI does NOT have Shift (facing lock). Facing follows movement direction.

---

## 3. Fitness Function (`FitnessEvaluator.js`)

Fitness accumulates per-enemy per-life in real-time:

```javascript
fitness =
    + (damage_dealt * 3.0)
    + (combo_hits * 5.0)
    - (damage_taken * 1.0)
    + (survival_time * 0.5)
    + (distance_closed * 0.2)        // Anti-camping: reward approaching
    - (idle_frames * 0.1)            // Penalize doing nothing
    + (successful_blocks * 2.0)
    + (kill_bonus * 50.0)

    // Mutation-specific
    + (latch_time * 4.0)             // PARASITE
    + (explosion_damage_dealt * 2.0) // VOLATILE (posthumous)
    + (split_children_damage * 1.5)  // SPLIT parent credited
    + (mimic_counter_hits * 3.0)     // MIMIC punishing patterns

// Short-lived enemies that dealt huge damage score well:
// final_fitness = raw_fitness / max(survival_seconds, 3)
```

---

## 4. Bone-Anchored Hitbox System

### Hitbox Definition

Every attack hitbox is attached to a specific bone. Position and rotation update every frame based on bone world transform.

```javascript
{
    bone: 'forearmR',
    localOffset: { x: 0.5, y: 0 },  // 0.5 = halfway along bone
    width: 1.2,                       // Relative to bone.length
    height: 0.6,                      // Relative to bone.length
    rotationOffset: 0,                // Additional radians
    activeStart: 4,                   // Frame within animation
    activeEnd: 7,
}
```

### HitboxManager.js

Each frame for each attacking fighter:
1. Check which hitboxes should be active based on animation frame
2. Spawn transient Matter.js sensor bodies for newly active hitboxes
3. Sync existing sensor body positions to their bone's world transform
4. Remove sensor bodies for hitboxes past their active window
5. Each hitbox tracks a hit list — can only hit each target once per attack

```javascript
// World position from bone + offset:
calcWorldPosition(bone, hitboxDef) {
    const along = hitboxDef.localOffset.x;  // 0–1 along bone axis
    const perp = hitboxDef.localOffset.y;    // perpendicular offset

    const dx = bone.worldEnd.x - bone.worldStart.x;
    const dy = bone.worldEnd.y - bone.worldStart.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    const nx = -dy / len;  // perpendicular unit
    const ny = dx / len;

    return {
        x: bone.worldStart.x + dx * along + nx * perp,
        y: bone.worldStart.y + dy * along + ny * perp
    };
}
```

### Hurtbox System (`HurtboxManager.js`)

Persistent sensor bodies tracking bones. Exist as long as the fighter is alive.

```javascript
// Default hurtbox config:
const BASE_HURTBOXES = [
    { bone: 'spine',     width: 0.8, height: 1.0, zone: 'torso' },
    { bone: 'head',      width: 1.2, height: 1.2, zone: 'head' },
    { bone: 'thighL',    width: 0.6, height: 0.8, zone: 'legs' },
    { bone: 'thighR',    width: 0.6, height: 0.8, zone: 'legs' },
    { bone: 'shinL',     width: 0.5, height: 0.7, zone: 'legs' },
    { bone: 'shinR',     width: 0.5, height: 0.7, zone: 'legs' },
    { bone: 'upperArmL', width: 0.5, height: 0.6, zone: 'arms' },
    { bone: 'upperArmR', width: 0.5, height: 0.6, zone: 'arms' },
];
```

Hurtboxes sync to bones every frame, scale automatically with skeleton scale. Mutations that add bones automatically get hurtboxes on those bones.

### Weak Spot Detection

Before resolving to a general bone zone, the system checks if the impact point is near a joint weak spot (small radius around joint position):

```javascript
// Joint weak spots:
KNEE:   thighL/R worldEnd,  radius 8px (scaled), zone 'knee'
ELBOW:  upperArmL/R worldEnd, radius 6px (scaled), zone 'elbow'
GROIN:  hip worldEnd, radius 10px (scaled), zone 'groin'

// Resolution order:
// 1. Check weak spot proximity first
// 2. Fall back to general bone zone
```

---

## 5. Damage Zone Definitions (`DamageZones.js`)

```javascript
const DAMAGE_ZONES = {
    head:   { hpMult: 2.0, kbMult: 3.0, stunMult: 1.5, structMult: 1.5,
              special: 'daze',         // 20% chance: 1s random inputs
              notes: 'Critical. Hard to reach on tall enemies.' },

    neck:   { hpMult: 1.8, kbMult: 1.5, stunMult: 2.0, structMult: 2.0,
              special: 'whiplash',     // Head ragdolls briefly
              notes: 'Fragile. Devastating stun.' },

    torso:  { hpMult: 1.0, kbMult: 1.0, stunMult: 1.0, structMult: 0.8,
              special: null,
              notes: 'Baseline. Well protected.' },

    arms:   { hpMult: 0.7, kbMult: 0.5, stunMult: 0.8, structMult: 1.2,
              special: null,
              notes: 'Low HP damage. Can disable attacks.' },

    legs:   { hpMult: 0.8, kbMult: 0.6, stunMult: 0.8, structMult: 1.0,
              special: null,
              notes: 'Moderate damage. Breaking cripples movement.' },

    // Joint weak spots
    knee:   { hpMult: 1.2, kbMult: 0.8, stunMult: 1.5, structMult: 2.5,
              special: 'buckle',       // Leg drops, brief stagger
              notes: 'Small target. Devastating structural.' },

    elbow:  { hpMult: 1.0, kbMult: 0.5, stunMult: 1.3, structMult: 2.0,
              special: 'hyper_extend', // Arm locks straight briefly
              notes: 'Dislocates easily. Disables arm.' },

    groin:  { hpMult: 1.5, kbMult: 0.3, stunMult: 2.5, structMult: 2.0,
              special: 'fold',         // Fighter doubles over
              notes: 'Extreme stun. Does not push back — folds in.' },
};
```

---

## 6. Structural Integrity System

### Bone Properties (`BoneProperties.js`)

Every bone has structural stats that determine how it breaks:

```javascript
//               density  structHP  thickness  hardness
head:           { 1.2,    40,       1.0,       0.3 }
neck:           { 0.8,    25,       0.7,       0.0 }
spine:          { 1.5,    80,       1.2,       0.2 }
upperArmL/R:    { 1.0,    35,       0.8,       0.1 }
forearmL/R:     { 0.9,    30,       0.7,       0.1 }
thighL/R:       { 1.3,    50,       1.0,       0.15 }
shinL/R:        { 1.1,    40,       0.9,       0.1 }
footL/R:        { 0.8,    20,       0.6,       0.05 }

density:     Mass per unit length. Higher = harder to break, heavier.
structHP:    Total structural damage before breaking.
thickness:   Visual width AND physics factor.
hardness:    Damage reduction on the bone (0–1, armor-like).
```

### Joint Properties (`JointProperties.js`)

```javascript
//                          strength  dislocateHP  flexibility  criticalAngle
neck_head:                 { 0.8,     20,          0.8,         1.5 }
spine_upperArmL/R:         { 1.2,     30,          2.5,         3.2 }
upperArm_forearmL/R:       { 1.0,     25,          2.8,         3.5 }
hip_thighL/R:              { 1.5,     40,          2.0,         2.8 }
thigh_shinL/R:             { 1.0,     25,          2.5,         3.0 }
shin_footL/R:              { 0.8,     15,          1.2,         1.8 }

strength:       Force resistance. Higher = harder to damage.
dislocateHP:    Structural HP before joint gives out.
flexibility:    Normal rotation range (radians).
criticalAngle:  If forced beyond this, instant bonus damage.
```

### Structural Damage Calculation (`StructuralSystem.js`)

When a hit connects with a bone's hurtbox:

```javascript
// Bone damage:
structDmg = attackDamage * (1 - bone.hardness) / bone.density
bone.currentHP -= structDmg
if (bone.currentHP <= 0) → BONE BREAK

// Joint damage (parent joint of hit bone):
perpFactor = abs(sin(impactAngle))   // Perpendicular hits stress joints more
jointDmg = (attackDamage * perpFactor) / joint.strength
joint.currentHP -= jointDmg
if (joint.currentHP <= 0) → JOINT DISLOCATION
```

### Break/Dislocation Consequences (`LimbDamageHandler.js`)

**Bone break** disables that bone and everything below it in the hierarchy:
- Combat: all hitboxes anchored to broken bones removed, moves using those bones disabled
- Hurtbox: remains (you can still hit a broken arm, damage passes to HP)
- Animation: bone enters ragdoll mode (pendulum physics from parent)
- Children cascade to ragdoll

**Joint dislocation** has the same effect — the child bone and below go limp.

**Leg injuries:**
```
1 bone broken:  LEG_INJURED — -30% speed, -50% jump, limp walk animation
2 bones broken: LEG_DESTROYED — -60% speed, no jump, drag animation
Both legs:      NO_LEGS — collapse to ground, crawl 10% speed, arms only
```

**Arm injuries:**
```
Arm broken: lose that arm's attacks and block side
Both arms:  cannot block, kicks only
```

**Critical structures:**
```
Spine break: -50% everything, constant 2 HP/sec drain, visible hunch
Neck break:  head ragdolls, +50% hitstun duration (not instant death)
```

### How Mutations Affect Structure

```
GIANT:         Neutral density. Big bones, same structural HP.
               Break a Giant's leg → it topples → head reachable.

ARMORED:       2.0x density, +0.3 hardness, 2.0x structural HP.
               1.8x joint strength. Extremely hard to break anything.

QUICK_TWITCH:  0.6x density, 0.5x structural HP, 0.5x joint HP.
               Glass bones. Snap easily.

STRETCHY:      3.0x bone structural HP (elastic, nearly unbreakable).
               0.4x joint dislocateHP (joints pop right out).

CRAWLER:       1.5x joint strength, 1.4x joint HP.
               Reinforced for weight-bearing on all fours.

LONG_ARMS:     Same density, but longer lever = more torque on elbow.
               Hits at the tip of long arms stress joints more
               (handled naturally by perpFactor in joint damage formula).
```

### Player Structural Bonuses

```javascript
PLAYER_BONE_HP_MULT: 1.5,          // 50% tougher bones
PLAYER_JOINT_HP_MULT: 1.5,         // 50% tougher joints
BLOCK_STRUCTURAL_NEGATION: 1.0,    // Blocking negates ALL structural damage
STRUCTURAL_HEAL_ON_BOSS: true,     // Reset before each boss fight
STRUCTURAL_HEAL_BETWEEN_WAVES: false,
```

---

## 7. Full Damage Pipeline (`DamagePipeline.js`)

Complete flow from collision to all effects:

```
 1. COLLISION DETECTED
    Hitbox sensor overlaps hurtbox sensor
    │
 2. RESOLVE HIT ZONE
    Check impact point against joint weak spots (small radius)
    Fall back to general bone zone
    → Returns: { zone, bone/joint, isPrecisionHit }
    │
 3. CALCULATE HP DAMAGE
    baseDmg = move.damage × attacker.stats.baseDamage
    zoneMult = zone.hpMult
    comboScale = COMBO_SCALING[comboStep]
    → hpDamage = baseDmg × zoneMult × comboScale
    │
 4. CALCULATE KNOCKBACK
    baseKB = move.knockback { x, y }
    zoneMult = zone.kbMult
    massFactor = max(0.1, attackMult / (defender.mass × defender.kbResist))
    → knockback = baseKB × zoneMult × massFactor
    │
 5. CALCULATE HITSTUN
    baseStun = move.hitstun
    zoneMult = zone.stunMult
    → hitstunFrames = baseStun × zoneMult
    │
 6. CALCULATE STRUCTURAL DAMAGE
    baseDmg = move.damage × attacker.stats.baseDamage
    zoneMult = zone.structMult
    structBonus = move.structuralBonusMult (default 1.0)
    → Apply to bone AND parent joint (no combo scaling)
    │
    ├── Bone HP ≤ 0? → LimbDamageHandler.onBoneBreak()
    ├── Joint HP ≤ 0? → LimbDamageHandler.onJointDislocate()
    ├── Spine HP ≤ 0? → LimbDamageHandler.onSpineBreak()
    ├── Neck HP ≤ 0? → LimbDamageHandler.onNeckBreak()
    │
 7. APPLY SPECIAL EFFECTS
    zone.special === 'daze'?         → 20% chance: random inputs 1s
    zone.special === 'whiplash'?     → Head ragdolls briefly
    zone.special === 'buckle'?       → Leg drops, brief stagger anim
    zone.special === 'fold'?         → Double-over animation, extended stun
    zone.special === 'hyper_extend'? → Arm locks straight, brief disable
    │
 8. APPLY BLOCK MODIFIERS (if defender is blocking)
    Standing block: hpDamage × 0.2, knockback × 0.2, structDamage = 0
    Crouch block:   same, but only blocks MID + LOW
    Air block:      hpDamage × 0.5, full knockback, structDamage = 0
    │
 9. APPLY HP DAMAGE
    defender.hp -= hpDamage × (1 - defender.damageReduction)
    │
10. APPLY KNOCKBACK
    Matter.Body.setVelocity(defender.body, knockback)
    │
11. APPLY HITSTUN
    defender.enterHitstun(hitstunFrames)
    │
12. VISUAL EFFECTS
    Hit spark at impact point
    Screen shake (scaled to damage)
    Bone break burst (if broke)
    Joint pop particles (if dislocated)
    Damage number popup (optional)
```

---

## 8. Knockback Formula

Universal formula used by every fighter:

```javascript
function calculateKnockback(attacker, defender, move, zone) {
    const baseKB = move.knockback;
    const attackMult = attacker.stats.baseDamage;
    const mass = defender.physics.mass;
    const kbResist = defender.stats.knockbackResist;
    const zoneMult = DAMAGE_ZONES[zone].kbMult;

    // Floor of 0.1 ensures even the heaviest fighter gets nudged
    const kbScale = Math.max(0.1, attackMult / (mass * kbResist));

    return {
        x: baseKB.x * zoneMult * kbScale * -defender.facingDirection,
        y: baseKB.y * zoneMult * kbScale
    };
}
```

### Worked Examples

Base punch knockback: `{ x: 6, y: -2 }`

```
Normal enemy (mass 1.0, kbResist 1.0):
  Torso: 6 × 1.0 × 1.0 = 6.0        ← standard
  Head:  6 × 3.0 × 1.0 = 18.0       ← staggers hard

Giant (mass 3.5, kbResist 2.5):
  Torso: 6 × 1.0 × 0.11 = 0.69      ← barely moves
  Head:  6 × 3.0 × 0.11 = 2.07      ← noticeable stagger

Dropkick on Giant head (baseKB { x: 12, y: -6 }):
  Head:  12 × 3.0 × 0.11 = 4.11     ← they actually stagger

Parasite (mass 0.3, kbResist 0.3):
  Torso: 6 × 1.0 × 11.1 = 66.6      ← LAUNCHED across arena
```

---

## 9. Trait System Stat Computation (`TraitSystem.js`)

Given axis values [-1.5 to +1.5], compute all derived stats:

```javascript
static computeStats(axes) {
    const { massSpeed, armorAgility, sizePrecision, complexStable, densityFragility } = axes;

    return {
        // Mass ←→ Speed
        mass:             lerp(2.0,  0.4,  norm(massSpeed)),
        moveSpeed:        lerp(0.5,  1.6,  norm(massSpeed)),
        knockbackResist:  lerp(2.5,  0.3,  norm(massSpeed)),
        attackSpeed:      lerp(0.6,  1.4,  norm(massSpeed)),
        baseDamage:       lerp(1.5,  0.6,  norm(massSpeed)),

        // Armor ←→ Agility
        damageReduction:  lerp(0.5,  0.0,  norm(armorAgility)),
        recoveryFrames:   lerp(1.5,  0.7,  norm(armorAgility)),
        canDash:          armorAgility > -0.5,
        movePenalty:       lerp(0.7,  1.0,  norm(armorAgility)),

        // Size ←→ Precision
        skeletonScale:    lerp(1.8,  0.5,  norm(sizePrecision)),
        hitboxScale:      lerp(1.6,  0.6,  norm(sizePrecision)),
        hurtboxScale:     lerp(1.8,  0.5,  norm(sizePrecision)),
        startupFrames:    lerp(1.4,  0.7,  norm(sizePrecision)),
        maxHP:            lerp(2.5,  0.4,  norm(sizePrecision)),

        // Complexity ←→ Stability
        neuralCostMult:   lerp(2.0,  1.0,  norm(complexStable)),
        hurtboxSurface:   lerp(1.5,  1.0,  norm(complexStable)),

        // Density ←→ Fragility
        boneHPMult:       lerp(2.0,  0.4,  norm(densityFragility)),
        jointHPMult:      lerp(2.0,  0.4,  norm(densityFragility)),
        boneDensity:      lerp(2.0,  0.5,  norm(densityFragility)),
    };
}

function norm(v) { return (v + 1.5) / 3; }  // [-1.5, +1.5] → [0, 1]
function lerp(min, max, t) { return min + (max - min) * t; }
```

### Stat Resolution Order

```
1. Start with BASE stats (same for all enemies)
2. Apply wave scaling multipliers
3. Sum axis values from all mutations
4. Clamp each axis to [-1.5, +1.5]
5. TraitSystem.computeStats() → derived stat multipliers
6. Multiply derived stats × base stats
7. Apply special mutation overrides (BERSERKER dynamic scaling, etc.)
8. Final stats locked for this enemy's lifetime
```

---

## 10. Input Timing Constants

```javascript
const INPUT_TIMING = {
    COMBO_BUFFER_WINDOW: 600,     // ms, inputs expire after this
    COMBO_CHAIN_WINDOW: 12,       // frames to chain next hit
    INPUT_BUFFER_SIZE: 8,         // max tracked inputs

    JUMP_BUFFER: 6,               // frames before landing to queue jump
    COYOTE_TIME: 6,               // frames after edge to still jump

    WALL_JUMP_GRACE: 6,           // frames after leaving wall
    WALL_SLIDE_ENTRY_WINDOW: 10,  // grace period to start wall slide

    DASH_DURATION: 8,             // frames
    DASH_COOLDOWN: 30,            // frames (ground)
    DASH_IFRAMES: [2, 5],         // invincible frames 2–5
    AIR_DASH_LIMIT: 1,            // per airborne period

    HIT_CANCEL_WINDOW: 4,         // frames early recovery on successful hit
    WHIFF_RECOVERY_PENALTY: 1.2,  // +20% recovery on miss
};
```
