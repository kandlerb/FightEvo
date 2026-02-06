# Fight EVO — Input Mapping Reference

> Definitive key bindings and contextual behavior for every input in every game state.
> This document is the single source of truth for input handling.

---

## 1. Key Assignments

```
┌─────────┬────────────────────────────┐
│ Key     │ Role                       │
├─────────┼────────────────────────────┤
│ W       │ Jump / Air float / Wall jump │
│ A       │ Move left / Wall slide     │
│ D       │ Move right / Wall slide    │
│ S       │ Crouch / Fast fall / Slide │
│ J       │ Punch (contextual)         │
│ K       │ Kick (contextual)          │
│ L       │ Block (contextual)         │
│ Space   │ Dash (directional)         │
│ Shift   │ Lock facing direction      │
│ ESC     │ Pause menu                 │
└─────────┴────────────────────────────┘
```

---

## 2. State Definitions

Before mapping inputs, here are all the player states an input can be received in:

```
GROUND STATES:
  IDLE          — Standing still on ground, no directional input
  WALKING       — Holding A or D on ground
  CROUCHING     — Holding S while idle on ground
  SLIDING       — Holding S + A or S + D on ground (ground slide)
  BLOCKING      — Holding L on ground
  CROUCH_BLOCK  — Holding L + S on ground
  ATTACKING     — In an attack animation on ground
  HITSTUN       — Staggered from a hit
  KNOCKDOWN     — On the floor, getting up
  DASHING       — Mid-dash on ground

AIR STATES:
  RISING        — Moving upward after a jump
  FALLING       — Moving downward (normal gravity)
  FLOATING      — Holding W in air (slowed descent)
  AIR_ATTACKING — In an attack animation in air
  AIR_HITSTUN   — Staggered in air
  FAST_FALLING  — Holding S in air (accelerated descent)
  DASHING_AIR   — Mid-dash in air

WALL STATES:
  WALL_SLIDING  — Touching wall + holding into wall + airborne
  WALL_JUMPING  — First frames after launching off wall
```

---

## 3. Full Input × State Matrix

### W — Jump / Float / Wall Jump

```
┌──────────────────┬─────────────────────────────────────────────────────┐
│ State            │ W Behavior                                          │
├──────────────────┼─────────────────────────────────────────────────────┤
│ IDLE             │ JUMP: Launch upward (full jump force)               │
│ WALKING          │ JUMP: Launch upward (preserves horizontal momentum) │
│ CROUCHING        │ STAND UP: Transition to IDLE (no jump)              │
│ SLIDING          │ JUMP: Low jump out of slide (60% jump force)        │
│ BLOCKING         │ JUMP: Cancel block → jump                           │
│ CROUCH_BLOCK     │ STAND UP: Cancel block → stand (no jump)            │
│ ATTACKING        │ BUFFERED: Queues jump for after recovery            │
│ HITSTUN          │ IGNORED: No input during hitstun                    │
│ KNOCKDOWN        │ IGNORED: No input during getup                      │
│ DASHING          │ IGNORED: Cannot interrupt dash                      │
│                  │                                                     │
│ RISING           │ No additional effect (already going up)             │
│ FALLING          │ FLOAT: Reduce gravity to 30% (slowed descent)       │
│                  │   Lasts as long as W is held                        │
│                  │   Enables extended aerial combat windows             │
│ FLOATING         │ CONTINUE: Maintain slowed descent while held        │
│                  │   Release W → resume normal FALLING                 │
│ AIR_ATTACKING    │ FLOAT: Apply float AFTER attack recovery            │
│ AIR_HITSTUN      │ IGNORED: No input during air hitstun                │
│ FAST_FALLING     │ CANCEL FAST FALL: Transition to FLOATING            │
│                  │   (W overrides S — lets player abort a fast fall)    │
│ DASHING_AIR      │ IGNORED: Cannot interrupt air dash                  │
│                  │                                                     │
│ WALL_SLIDING     │ WALL JUMP: Launch away from wall + upward           │
│                  │   Direction: opposite of wall side                  │
│                  │   Force: 1.2x normal jump (boosted)                 │
│                  │   Ex: Sliding down LEFT wall → launches RIGHT + UP  │
│ WALL_JUMPING     │ FLOAT: Can float after wall jump apex               │
└──────────────────┴─────────────────────────────────────────────────────┘

W HOLD vs TAP:
  - Ground: TAP to jump (press, not hold-dependent)
  - Air:    HOLD to float (must hold to maintain float)
  - Wall:   TAP to wall jump (press, not hold-dependent)
```

### A — Move Left / Wall Slide

```
┌──────────────────┬─────────────────────────────────────────────────────┐
│ State            │ A Behavior                                          │
├──────────────────┼─────────────────────────────────────────────────────┤
│ IDLE             │ WALK LEFT: Move left, face left (unless Shift held) │
│ WALKING (right)  │ REVERSE: Decelerate → walk left                     │
│ CROUCHING        │ IGNORED: Stay crouching (must release S first)      │
│                  │   OR if S+A pressed simultaneously → SLIDE LEFT     │
│ SLIDING          │ CONTINUE/CHANGE: Slide direction updates            │
│ BLOCKING         │ WALK LEFT + BLOCK: Slow walk while blocking (50%)   │
│ CROUCH_BLOCK     │ IGNORED: Cannot move while crouch blocking          │
│ ATTACKING        │ BUFFERED: Movement queued for after recovery        │
│ HITSTUN          │ IGNORED                                             │
│ KNOCKDOWN        │ IGNORED                                             │
│ DASHING          │ IGNORED: Cannot redirect mid-dash                   │
│                  │                                                     │
│ RISING           │ AIR DRIFT LEFT: Horizontal air control (60% speed)  │
│ FALLING          │ AIR DRIFT LEFT: Horizontal air control (60% speed)  │
│ FLOATING         │ AIR DRIFT LEFT: Horizontal air control (60% speed)  │
│ FAST_FALLING     │ AIR DRIFT LEFT: Horizontal air control (40% speed)  │
│ AIR_ATTACKING    │ MINOR DRIFT: Slight left drift (20% speed)          │
│ AIR_HITSTUN      │ DI (Directional Influence): Slight left shift on KB │
│ DASHING_AIR      │ IGNORED: Cannot redirect mid-dash                   │
│                  │                                                     │
│ WALL (right wall)│ WALL SLIDE: Press A while on right wall → slide     │
│                  │   Hold A to maintain wall contact                   │
│                  │   Release A → fall away from wall                   │
│ WALL (left wall) │ AWAY FROM WALL: Release/move away, no slide         │
│ WALL_SLIDING     │ MAINTAIN: Continue sliding (if on right wall)       │
│                  │   If on left wall: A pushes INTO wall = stay stuck  │
│ WALL_JUMPING     │ AIR DRIFT: Normal air drift left                    │
└──────────────────┴─────────────────────────────────────────────────────┘

WALL SLIDE CLARIFICATION:
  To wall slide, you must be:
    1. Airborne
    2. Touching a wall
    3. Holding the direction INTO the wall (A for left wall, D for right wall)
  The slide is on the SAME side as the key:
    - Touching LEFT wall + holding A = wall slide
    - Touching RIGHT wall + holding D = wall slide
```

### D — Move Right / Wall Slide

```
Mirrors A exactly, with left/right swapped.
All behaviors are symmetric.
```

### S — Crouch / Fast Fall / Slide / Ground Slam

```
┌──────────────────┬─────────────────────────────────────────────────────┐
│ State            │ S Behavior                                          │
├──────────────────┼─────────────────────────────────────────────────────┤
│ IDLE             │ CROUCH: Lower stance, shrink hurtbox height         │
│                  │   Hurtbox height reduced by ~40%                    │
│                  │   Dodges high attacks                               │
│                  │   Hold to stay crouched                             │
│ WALKING          │ SLIDE: Ground slide in current movement direction   │
│                  │   Momentum-based: faster walk = longer slide        │
│                  │   Low profile (same hurtbox as crouch)              │
│                  │   Duration: ~0.5s, then transition to CROUCHING     │
│                  │   Can attack out of slide (slide punch, slide kick) │
│ CROUCHING        │ MAINTAIN: Stay crouched                             │
│ SLIDING          │ MAINTAIN: Continue slide until momentum expires      │
│ BLOCKING         │ CROUCH BLOCK: Transition to lower block stance      │
│                  │   Blocks low attacks that standing block misses     │
│ CROUCH_BLOCK     │ MAINTAIN: Stay in crouch block                      │
│ ATTACKING        │ IGNORED: Cannot crouch during attack                │
│ HITSTUN          │ IGNORED                                             │
│ KNOCKDOWN        │ IGNORED                                             │
│ DASHING (ground) │ GROUND SLAM: Cancel dash into slide                 │
│                  │   If dashing forward + S → slide                    │
│                  │                                                     │
│ RISING           │ FAST FALL: Immediately reverse vertical velocity    │
│                  │   Fall speed = 2.5x normal gravity                  │
│                  │   Cancels all upward momentum                       │
│ FALLING          │ FAST FALL: Accelerate descent (2.5x gravity)        │
│ FLOATING         │ CANCEL FLOAT → FAST FALL: Override W with S         │
│                  │   Immediate transition to accelerated descent       │
│ AIR_ATTACKING    │ BUFFERED FAST FALL: Apply after attack recovery     │
│ AIR_HITSTUN      │ IGNORED                                             │
│ FAST_FALLING     │ MAINTAIN: Continue fast falling                     │
│ DASHING_AIR      │ GROUND SLAM: Cancel air dash into downward slam     │
│                  │   Diagonal down trajectory toward ground            │
│                  │   Impact creates small shockwave hitbox             │
│                  │   Damage scales with height fallen                  │
│                  │                                                     │
│ WALL_SLIDING     │ FAST DROP: Release wall, fall at 2.5x speed         │
│                  │   Drops straight down off the wall                  │
│ WALL_JUMPING     │ FAST FALL: Cancel wall jump momentum → drop         │
└──────────────────┴─────────────────────────────────────────────────────┘

S HOLD vs TAP:
  - Ground idle:     HOLD to crouch (release to stand)
  - Ground walking:  TAP to initiate slide (slide has fixed duration)
  - Air:             TAP to initiate fast fall (stays fast until landing)
  - Wall:            TAP to drop off wall fast
```

### J — Punch (Contextual)

```
┌──────────────────┬─────────────────────────────────────────────────────┐
│ State            │ J Behavior                                          │
├──────────────────┼─────────────────────────────────────────────────────┤
│ IDLE             │ STANDING JAB: Quick straight punch                  │
│                  │   Hitbox: forearm + hand                            │
│                  │   Fast startup (3f), low damage, low recovery       │
│ WALKING          │ WALKING PUNCH: Jab with forward momentum            │
│                  │   Slight lunge forward                              │
│                  │   Feeds into combo system (see below)               │
│ CROUCHING        │ UPPERCUT: Rising punch from crouch                  │
│                  │   Hitbox: sweeps upward from low to high            │
│                  │   Launches opponent upward on hit                   │
│                  │   Higher damage, slower startup (6f)                │
│ SLIDING          │ SLIDE PUNCH: Low lunging punch during ground slide  │
│                  │   Hits low — must be blocked low                    │
│                  │   Carries slide momentum                            │
│ BLOCKING         │ IGNORED: Cannot attack while blocking               │
│ CROUCH_BLOCK     │ IGNORED: Cannot attack while blocking               │
│ ATTACKING        │ COMBO BUFFER: If in combo window, queues next hit   │
│                  │   Combo system resolves based on sequence            │
│ HITSTUN          │ IGNORED                                             │
│ KNOCKDOWN        │ IGNORED                                             │
│ DASHING          │ DASH PUNCH: Lunging punch using dash momentum       │
│                  │   High damage, inherits dash speed                  │
│                  │   Cancels remaining dash frames into attack          │
│                  │                                                     │
│ RISING           │ RISING PUNCH: Uppercut during jump ascent           │
│                  │   Anti-air move — good for catching above           │
│ FALLING          │ AIR PUNCH: Downward-angled jab                      │
│                  │   Hitbox angles based on fall trajectory             │
│ FLOATING         │ AIR PUNCH: Same as falling but with more hang time  │
│ FAST_FALLING     │ DIVING PUNCH: Downward strike with fast-fall force  │
│                  │   Extra damage from fall speed                      │
│ AIR_ATTACKING    │ COMBO BUFFER: If in aerial combo window, chains     │
│ AIR_HITSTUN      │ IGNORED                                             │
│ DASHING_AIR      │ DASH PUNCH: Same as ground dash punch but aerial    │
│                  │                                                     │
│ WALL_SLIDING     │ IGNORED: Cannot punch while wall sliding            │
│ WALL_JUMPING     │ WALL JUMP PUNCH: Outward punch off the wall         │
│                  │   Direction: away from wall                         │
│                  │   Good for catching enemies near the wall           │
└──────────────────┴─────────────────────────────────────────────────────┘
```

### K — Kick (Contextual)

```
┌──────────────────┬─────────────────────────────────────────────────────┐
│ State            │ K Behavior                                          │
├──────────────────┼─────────────────────────────────────────────────────┤
│ IDLE             │ STANDING KICK: Mid-height kick                      │
│                  │   Hitbox: shin + foot                               │
│                  │   Medium startup (5f), good range                   │
│ WALKING          │ STEP KICK: Kick with walking momentum               │
│                  │   More range than standing kick                     │
│                  │   Feeds into combo system                           │
│ CROUCHING        │ SWEEP: Low sweeping kick along the ground           │
│                  │   Hits low — must be blocked low or jumped          │
│                  │   Can knock down (trips opponent)                   │
│                  │   Hitbox: foot sweeps in arc at ground level        │
│ SLIDING          │ SLIDE KICK: Extended leg slide (like a baseball     │
│                  │   slide). Long range, low profile, trips            │
│                  │   Carries full slide momentum                       │
│ BLOCKING         │ IGNORED: Cannot attack while blocking               │
│ CROUCH_BLOCK     │ IGNORED: Cannot attack while blocking               │
│ ATTACKING        │ COMBO BUFFER: Queues kick as next combo hit         │
│ HITSTUN          │ IGNORED                                             │
│ KNOCKDOWN        │ IGNORED                                             │
│ DASHING          │ DASH KICK: Flying kick using dash speed             │
│                  │   Big damage, big commitment, big recovery          │
│                  │                                                     │
│ RISING           │ RISING KICK: Knee strike during ascent              │
│                  │   Compact hitbox, catches close enemies             │
│ FALLING          │ AIR KICK: Standard aerial kick                      │
│                  │   Angled slightly downward                          │
│ FLOATING         │ AIR KICK: Same as falling, extended window          │
│ FAST_FALLING     │ STOMP: Downward kick aimed straight down            │
│                  │   Spike move — drives opponent downward on hit      │
│                  │   Extra damage from fall speed                      │
│ AIR_ATTACKING    │ COMBO BUFFER: Aerial combo chain                    │
│ AIR_HITSTUN      │ IGNORED                                             │
│ DASHING_AIR      │ DROPKICK: Full-body horizontal kick                 │
│                  │   Highest kick damage in air                        │
│                  │   Both legs extended — huge hitbox                  │
│                  │   Heavy recovery on whiff                           │
│                  │                                                     │
│ WALL_SLIDING     │ IGNORED: Cannot kick while wall sliding             │
│ WALL_JUMPING     │ WALL JUMP KICK: Diving kick off the wall            │
│                  │   Direction follows wall jump trajectory            │
│                  │   Can aim with directional input:                   │
│                  │     Neutral: follows wall jump arc                  │
│                  │     S + K: Diving kick (angled downward)            │
│                  │     W + K: Rising kick (angled upward)              │
└──────────────────┴─────────────────────────────────────────────────────┘
```

### L — Block (Contextual)

```
┌──────────────────┬─────────────────────────────────────────────────────┐
│ State            │ L Behavior                                          │
├──────────────────┼─────────────────────────────────────────────────────┤
│ IDLE             │ STANDING BLOCK: Guard mid and high attacks           │
│                  │   Reduces HP damage by 80%                          │
│                  │   Negates ALL structural damage                     │
│                  │   Blocks knockback (reduced to 20%)                 │
│                  │   DOES NOT block low attacks (sweeps, slides)       │
│                  │   Hold to maintain, release to drop guard           │
│ WALKING          │ WALK BLOCK: Slow walk (50% speed) while guarding    │
│                  │   Same protection as standing block                 │
│                  │   Can reposition while defending                    │
│ CROUCHING        │ CROUCH BLOCK: Guard low and mid attacks             │
│                  │   DOES NOT block high attacks or overheads          │
│                  │   Blocks sweeps and slide attacks                   │
│                  │   Low profile reduces hurtbox                       │
│ SLIDING          │ CANNOT BLOCK: Sliding is a committed action         │
│ BLOCKING         │ MAINTAIN: Continue blocking                         │
│ CROUCH_BLOCK     │ MAINTAIN: Continue crouch blocking                  │
│ ATTACKING        │ CANNOT BLOCK: Cannot cancel attack into block       │
│                  │   This is a core risk/reward — attacks are commits  │
│ HITSTUN          │ IGNORED                                             │
│ KNOCKDOWN        │ IGNORED                                             │
│ DASHING          │ CANNOT BLOCK: Dash is committed                     │
│                  │                                                     │
│ RISING           │ AIR BLOCK: Guard attacks from any direction         │
│                  │   Reduced effectiveness: 50% damage reduction       │
│                  │   Full knockback (no KB reduction in air)           │
│                  │   Still negates structural damage                   │
│ FALLING          │ AIR BLOCK: Same as rising                           │
│ FLOATING         │ AIR BLOCK: Same as rising (good for float defense)  │
│ FAST_FALLING     │ CANNOT BLOCK: Fast fall is committed                │
│ AIR_ATTACKING    │ CANNOT BLOCK: Mid-attack                            │
│ AIR_HITSTUN      │ IGNORED                                             │
│ DASHING_AIR      │ CANNOT BLOCK: Air dash is committed                 │
│                  │                                                     │
│ WALL_SLIDING     │ CANNOT BLOCK: Wall slide is committed               │
│ WALL_JUMPING     │ AIR BLOCK: Can block during wall jump arc           │
│                  │   Same reduced air block rules                      │
└──────────────────┴─────────────────────────────────────────────────────┘

BLOCK COVERAGE DIAGRAM:

  Standing Block (L):          Crouch Block (S + L):
  ┌───────────┐                ┌───────────┐
  │ ████HIGH██│ ← BLOCKED      │           │ ← NOT blocked
  │ ████MID███│ ← BLOCKED      │ ████MID███│ ← BLOCKED
  │           │ ← NOT blocked  │ ████LOW███│ ← BLOCKED
  └───────────┘                └───────────┘

  Attack heights:
    HIGH:    Head-level attacks, overheads, aerial attacks
    MID:     Torso-level attacks, standard punches and kicks
    LOW:     Ground-level attacks, sweeps, slide kicks

  Air Block (L in air):
  ┌───────────┐
  │ ██ALL█████│ ← Blocks all directions
  │ ██REDUCED█│    but at 50% damage reduction
  │ ██████████│    and full knockback received
  └───────────┘
```

### Space — Dash (Directional)

```
┌──────────────────┬─────────────────────────────────────────────────────┐
│ State            │ Space Behavior                                      │
├──────────────────┼─────────────────────────────────────────────────────┤
│ IDLE             │ DASH: Direction based on FACING direction            │
│                  │   No WASD held → dash forward (facing dir)          │
│ WALKING          │ DASH: Direction based on WASD input                  │
│                  │   A held → dash left                                │
│                  │   D held → dash right                               │
│ CROUCHING        │ CANNOT DASH: Must stand first                       │
│ SLIDING          │ CANNOT DASH: Already in a slide                     │
│ BLOCKING         │ CANNOT DASH: Must drop guard first                  │
│ CROUCH_BLOCK     │ CANNOT DASH: Must stand and drop guard              │
│ ATTACKING        │ CANNOT DASH: Cannot cancel attack into dash         │
│ HITSTUN          │ IGNORED                                             │
│ KNOCKDOWN        │ IGNORED                                             │
│ DASHING          │ IGNORED: Cannot dash during dash (cooldown applies) │
│                  │                                                     │
│ RISING           │ AIR DASH: Directional based on WASD                 │
│ FALLING          │ AIR DASH: Directional based on WASD                 │
│ FLOATING         │ AIR DASH: Cancels float → dash direction            │
│ FAST_FALLING     │ CANNOT DASH: Fast fall is committed                 │
│ AIR_ATTACKING    │ CANNOT DASH: Cannot cancel air attack               │
│ AIR_HITSTUN      │ IGNORED                                             │
│ DASHING_AIR      │ IGNORED: One air dash per airborne period           │
│                  │                                                     │
│ WALL_SLIDING     │ WALL DASH: Dash away from wall (horizontal)         │
│                  │   Faster than wall jump but no vertical gain        │
│                  │   Good for quick escape from wall                   │
│ WALL_JUMPING     │ CANNOT DASH: Already in wall jump momentum          │
└──────────────────┴─────────────────────────────────────────────────────┘

DASH DIRECTIONS (based on WASD held when Space pressed):

  Ground:
    A         → Dash LEFT
    D         → Dash RIGHT
    W + A     → CANNOT dash straight up; dash left with slight rise
    W + D     → CANNOT dash straight up; dash right with slight rise
    S + (A/D) → Dash into ground slide (converts dash to slide)
    W alone   → NO DASH (cannot dash straight up)
    S alone   → NO DASH (cannot dash straight down on ground)
    Nothing   → Dash in FACING direction

  Air:
    A         → Air dash LEFT (horizontal)
    D         → Air dash RIGHT (horizontal)
    W + A     → Air dash UP-LEFT (45°)
    W + D     → Air dash UP-RIGHT (45°)
    S + A     → Air dash DOWN-LEFT (45°)
    S + D     → Air dash DOWN-RIGHT (45°)
    W alone   → NO DASH (cannot dash straight up)
    S alone   → GROUND SLAM: Dash straight down
                Impact creates shockwave hitbox
                Damage scales with current height
    Nothing   → Air dash in FACING direction (horizontal)

  DASH PROPERTIES:
    Duration:     8 frames
    Speed:        2.0x movement speed
    Cooldown:     30 frames (ground), resets on landing (air)
    Air dashes:   1 per airborne period (resets on ground touch)
    I-frames:     Frames 2-5 of dash are invincible (dodge through attacks)
```

### Shift — Facing Lock

```
┌──────────────────┬─────────────────────────────────────────────────────┐
│ State            │ Shift Behavior                                      │
├──────────────────┼─────────────────────────────────────────────────────┤
│ ANY STATE        │ HOLD: Lock current facing direction                 │
│                  │   Movement inputs move the character but do NOT     │
│                  │   change which way they face                        │
│                  │   Attacks, blocks go in locked facing direction     │
│                  │                                                     │
│                  │ RELEASE: Facing follows movement again              │
│                  │                                                     │
│                  │ Works in ALL states including air, wall, attacking  │
│                  │                                                     │
│                  │ CANNOT be pressed to CHANGE facing — it only LOCKS  │
│                  │ the current direction. To face the other way:       │
│                  │   1. Release Shift                                  │
│                  │   2. Tap the desired direction                      │
│                  │   3. Hold Shift again to lock new direction         │
└──────────────────┴─────────────────────────────────────────────────────┘
```

### ESC — Pause

```
┌──────────────────┬─────────────────────────────────────────────────────┐
│ State            │ ESC Behavior                                        │
├──────────────────┼─────────────────────────────────────────────────────┤
│ PLAYING (any)    │ PAUSE: Freeze game, show pause menu                 │
│                  │   All physics/AI/timers stop                        │
│                  │   Menu: Resume, Restart, Settings, Quit             │
│ PAUSED           │ RESUME: Unpause, return to gameplay                 │
│ MENU             │ BACK: Navigate back in menu hierarchy               │
│ GAME_OVER        │ IGNORED: Use menu buttons instead                   │
└──────────────────┴─────────────────────────────────────────────────────┘
```

---

## 4. Combo System — How J/K Chain Together

Combos are resolved from the **input buffer** which tracks the last N action inputs within a time window. The move that fires depends on the current combo step, player state, and directional context.

### Combo Buffer

```javascript
// Buffer tracks recent ATTACK inputs (J/K only — movement is separate)
// Each entry: { action: 'punch'|'kick', direction: 'forward'|'back'|'up'|'down'|'neutral', frame: number }

COMBO_BUFFER = {
    maxSize: 8,              // Track last 8 attack inputs
    windowMs: 600,           // Inputs older than 600ms expire
    chainWindowFrames: 12,   // After an attack's active frames end,
                             // you have 12 frames to input the next
                             // hit to continue the combo
};
```

### Ground Combo Chains

```
STANDING COMBOS (starting from IDLE or WALKING):

  J                     → Jab (quick punch)
  J → J                 → Jab → Cross (1-2 punch)
  J → J → J             → Jab → Cross → Hook (3-hit combo)
  J → J → K             → Jab → Cross → Roundhouse kick (finisher)
  J → K                 → Jab → Side kick
  K                     → Front kick
  K → K                 → Front kick → High kick
  K → J                 → Front kick → Body blow
  K → K → K             → Front kick → High kick → Spin kick (finisher)

  Direction modifiers (applied to the NEXT input in the chain):
  S + J (during chain)  → Low punch (hits low, must block low)
  S + K (during chain)  → Sweep (trips, must block low)
  W + J (during chain)  → Uppercut (launches opponent)
  W + K (during chain)  → Axe kick (overhead, must block standing)

CROUCHING COMBOS:
  J                     → Uppercut (standalone from crouch)
  K                     → Sweep
  J → J                 → Uppercut → Overhead smash

DASH COMBOS (Space then attack):
  Space → J             → Dash punch (lunging straight)
  Space → K             → Dash kick (flying kick)
  Space → S + J         → Dash → Slide punch
  Space → S + K         → Dash → Slide kick
```

### Air Combo Chains

```
AIR COMBOS (while airborne):

  J                     → Air jab
  J → J                 → Air jab → Air cross
  K                     → Air kick
  J → K                 → Air jab → Air kick (launcher extender)
  K → S + K             → Air kick → Stomp (spike downward)

WALL JUMP COMBOS:
  (after wall jump) J   → Wall jump punch
  (after wall jump) K   → Wall jump kick
  (after wall jump) S+K → Diving kick (angled down)
  (after wall jump) W+K → Rising kick (angled up)
```

### Combo Damage Scaling

To prevent infinite combos from being too dominant:

```javascript
COMBO_SCALING = {
    hit1: 1.0,     // Full damage
    hit2: 0.9,     // 90%
    hit3: 0.8,     // 80%
    hit4: 0.7,     // 70%
    hit5: 0.6,     // 60%
    hit6Plus: 0.5, // 50% floor — combos can keep going but with diminishing returns

    // Structural damage does NOT scale — every hit does full structural damage
    // This means long combos are efficient for breaking limbs even if
    // HP damage falls off
    structuralScaling: false,
};
```

---

## 5. Input Priority / Conflict Resolution

When multiple keys are pressed simultaneously:

```
PRIORITY ORDER (highest to lowest):
  1. ESC (always takes priority)
  2. Block (L) — defensive action prioritized
  3. Attack (J/K) — offensive actions
  4. Dash (Space) — movement ability
  5. Jump (W) — vertical movement
  6. Crouch/Fast fall (S) — vertical modifier
  7. Horizontal movement (A/D) — base movement
  8. Facing lock (Shift) — modifier, always processed

SIMULTANEOUS PRESS RULES:
  J + K at same frame → J wins (punch priority), K is buffered
  L + J at same frame → L wins (block priority), J is ignored
  W + S at same frame → W wins (jump/float overrides crouch/fast fall)
  A + D at same frame → Cancel out, no horizontal movement
  Space + L at same frame → Space wins if on ground, L wins if in air
```

---

## 6. Enemy AI Input Mapping

NEAT outputs map to the same input system. The AI doesn't get special actions — it presses the same virtual buttons:

```javascript
// NEAT outputs → virtual key states
const AI_OUTPUT_MAP = {
    0: 'A',          // move_left
    1: 'D',          // move_right
    2: 'W',          // jump / float / wall jump
    3: 'S',          // crouch / fast fall
    4: 'J',          // punch
    5: 'K',          // kick
    6: 'L',          // block
    7: 'Space',      // dash
};

// AI does NOT have Shift (facing lock) — facing follows movement
// AI processes through the SAME combo system and state machine
// AI learns combos by sequencing outputs across frames
// AI benefits from the same contextual moves (crouch punch = uppercut, etc.)
```

---

## 7. Input Timing Constants

```javascript
const INPUT_TIMING = {
    // Buffer
    COMBO_BUFFER_WINDOW: 600,       // ms — inputs older than this expire
    COMBO_CHAIN_WINDOW: 12,         // frames — window to chain next hit
    INPUT_BUFFER_SIZE: 8,           // max tracked inputs

    // Responsiveness
    JUMP_BUFFER: 6,                 // frames — press W up to 6f before landing
                                    //   and jump executes on ground contact
    COYOTE_TIME: 6,                 // frames — can still jump 6f after
                                    //   walking off an edge

    // Wall
    WALL_JUMP_GRACE: 6,            // frames — can wall jump after leaving wall
    WALL_SLIDE_ENTRY_WINDOW: 10,   // frames — grace period to start wall slide

    // Dash
    DASH_DURATION: 8,              // frames
    DASH_COOLDOWN: 30,             // frames (ground)
    DASH_IFRAMES: [2, 5],          // frames 2 through 5 are invincible
    AIR_DASH_LIMIT: 1,             // per airborne period

    // Attack
    HIT_CANCEL_WINDOW: 4,          // frames — on hit, can cancel recovery
                                    //   into next combo move 4f early
    WHIFF_RECOVERY_PENALTY: 1.2,   // multiplier — missing an attack adds
                                    //   20% to recovery frames
};
```
