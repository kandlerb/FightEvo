# Fight EVO — Architecture Document

> Core systems, game loop, physics, skeleton/animation, rendering pipeline, and configuration.

---

## 1. Game Loop (`GameLoop.js`)

Fixed-timestep update with variable rendering for deterministic physics.

```
Target: 60 UPS (updates per second), uncapped FPS

loop(timestamp):
    accumulator += (timestamp - lastTime)
    lastTime = timestamp

    while accumulator >= FIXED_DT:
        InputManager.poll()
        PhysicsWorld.step(FIXED_DT)
        Game.update(FIXED_DT)
        accumulator -= FIXED_DT

    Renderer.draw(interpolation)
    requestAnimationFrame(loop)
```

---

## 2. Game State Machine (`Game.js`)

```
Top-level states:
  MENU → PLAYING → GAME_OVER
                 → PAUSED → PLAYING

PLAYING sub-states:
  WAVE_ACTIVE → WAVE_TRANSITION → WAVE_ACTIVE
              → BOSS_INTRO → BOSS_FIGHT → WAVE_TRANSITION
              → PLAYER_DEAD → GAME_OVER

WAVE_ACTIVE:
  - Enemies spawn continuously
  - Kill count tracked toward wave advancement
  - Evolution runs in background on enemy deaths

BOSS_FIGHT:
  - All regular enemies cleared
  - Single boss enemy (dominant genome + mutations)
  - No respawns until boss is dead
```

---

## 3. Input Manager (`InputManager.js`)

Tracks raw key state, manages facing direction with shift-lock, and maintains the combo buffer.

```javascript
class InputManager {
    constructor() {
        this.keysDown = {};
        this.keysPressed = {};       // True only on the frame a key goes down
        this.facingDirection = 1;    // 1 = right, -1 = left
        this.facingLocked = false;
        this.moveDirection = 0;      // -1, 0, or 1
        this.comboBuffer = [];       // Attack input history
    }

    update() {
        const movingLeft  = this.isDown('A');
        const movingRight = this.isDown('D');
        const shiftHeld   = this.isDown('SHIFT');

        // Facing lock
        this.facingLocked = shiftHeld;
        if (!this.facingLocked) {
            if (movingRight && !movingLeft) this.facingDirection = 1;
            if (movingLeft && !movingRight) this.facingDirection = -1;
        }

        // Raw movement direction (independent of facing)
        this.moveDirection = 0;
        if (movingRight) this.moveDirection += 1;
        if (movingLeft)  this.moveDirection -= 1;
    }

    // Combo buffer uses relative directions
    getComboDirection() {
        if (this.moveDirection === this.facingDirection) return 'forward';
        if (this.moveDirection === -this.facingDirection) return 'back';
        if (this.isDown('W')) return 'up';
        if (this.isDown('S')) return 'down';
        return 'neutral';
    }
}
```

See `fight-evo-input-mapping.md` for the complete input × state matrix.

---

## 4. Physics Layer (Matter.js)

### PhysicsWorld.js

Thin wrapper around `Matter.Engine` and `Matter.World`. The engine is stepped manually by the game loop, not by `Matter.Runner`.

```javascript
const PHYSICS = {
    GRAVITY: { x: 0, y: 1.5 },       // Heavier than default Matter.js
    FIXED_DT: 1000 / 60,             // 16.67ms steps
    GROUND_FRICTION: 0.05,
    AIR_FRICTION: 0.01,
};
```

### Collision Categories

Bitmask-based filtering. Hitboxes only collide with opposing fighters.

```javascript
const CATEGORY = {
    GROUND:    0x0001,
    PLAYER:    0x0002,
    ENEMY:     0x0004,
    HITBOX:    0x0008,
    HURTBOX:   0x0010,
    WALL:      0x0020,
    PLATFORM:  0x0040,
};

// Player hitbox mask:  ENEMY hurtboxes only
// Enemy hitbox mask:   PLAYER hurtboxes only
// Fighter body mask:   GROUND | WALL | PLATFORM | opposing fighters
```

### Fighter Physics Body

Each fighter has a compound Matter.js body:

```
┌─────────────────┐
│   Main Body     │  ← Dynamic rectangle, fixed rotation (inertia: Infinity)
│   (~30×70 px)   │     Collides with ground, walls, other fighters
│                 │
│   ┌───────────┐ │
│   │Foot Sensor│ │  ← Thin sensor at base, detects ground contact
│   └───────────┘ │     isSensor: true, triggers grounded state
└─────────────────┘

Movement: via Matter.Body.setVelocity() and applyForce()
No direct position setting during gameplay (physics-driven)
```

Body dimensions scale with mutations (GIANT = 1.8x, PARASITE = 0.45x). The foot sensor scales proportionally.

---

## 5. Skeleton & Animation System

### Skeleton Hierarchy (`Skeleton.js`)

Hierarchical bone tree anchored to the physics body position:

```
hip (root) ─── anchored to physics body center-bottom
├── spine
│   ├── neck
│   │   └── head
│   ├── shoulderL
│   │   └── upperArmL
│   │       └── forearmL
│   │           └── handL
│   └── shoulderR
│       └── upperArmR
│           └── forearmR
│               └── handR
├── hipL
│   └── thighL
│       └── shinL
│           └── footL
└── hipR
    └── thighR
        └── shinR
            └── footR
```

Mutations extend this hierarchy. `EXTRA_ARMS` adds `shoulderL2 → upperArmL2 → forearmL2 → handL2` (and mirrored right). `MULTI_HEAD` adds `neck2 → head2`. `TAIL` adds `tail` from hip.

### Bone (`Bone.js`)

Each bone stores:

```javascript
{
    name: 'forearmR',
    parent: 'upperArmR',
    children: ['handR'],
    length: 18,                // Pixels at base scale
    localRotation: 0,          // Radians, relative to parent
    worldPosition: { x, y },   // Computed each frame
    worldRotation: 0,           // Computed each frame
    worldStart: { x, y },      // Base of bone (parent joint)
    worldEnd: { x, y },        // Tip of bone (child joint)
    mode: 'animated',           // 'animated' | 'ragdoll'
    angularVelocity: 0,         // Used in ragdoll mode
}
```

### Bone Modes

- **`animated`**: Follows keyframe poses from the Animation system. Standard mode.
- **`ragdoll`**: Broken/dislocated. No longer follows animation. Instead, simulates as a pendulum hanging from parent bone with gravity and damping. All children cascade to ragdoll.

```javascript
// Ragdoll update (in Skeleton.js):
if (bone.mode === 'ragdoll') {
    const gravityTorque = Math.sin(bone.worldRotation) * GRAVITY * bone.length * 0.01;
    bone.angularVelocity += gravityTorque * dt;
    bone.angularVelocity *= 0.95;  // Damping
    bone.localRotation += bone.angularVelocity * dt;
    bone.localRotation = clamp(bone.localRotation, -Math.PI * 0.8, Math.PI * 0.8);
}
```

### Poses & Animation (`Pose.js`, `Animation.js`)

- **Pose**: Dictionary of `{ boneName: localRotation }` for every bone.
- **Animation**: Ordered list of `{ pose: Pose, duration: frames, hitboxSpawn?: HitboxDef }`.
- **Interpolation**: Angular LERP with shortest-path between keyframes.
- **Blending**: Crossfade between animations over N frames during state transitions.

### Animation Library (`AnimationLibrary.js`)

```
| Animation        | Frames | Loop | Notes                          |
|------------------|--------|------|--------------------------------|
| idle             | 60     | yes  | Subtle breathing sway          |
| walk_forward     | 20     | yes  | —                              |
| walk_backward    | 20     | yes  | —                              |
| jump_rise        | 10     | no   | Transitions to jump_float      |
| jump_float       | —      | yes  | Held while airborne            |
| jump_land        | 6      | no   | Transitions to idle            |
| crouch           | 6      | hold | Lower stance                   |
| slide            | 15     | no   | Ground slide, low profile      |
| wall_slide       | —      | yes  | Held while on wall             |
| punch_jab        | 12     | no   | Hitbox frames 4–7              |
| punch_cross      | 14     | no   | Hitbox frames 5–9              |
| punch_uppercut   | 16     | no   | Hitbox frames 6–10, launches   |
| kick_front       | 14     | no   | Hitbox frames 5–9              |
| kick_sweep       | 16     | no   | Hitbox frames 6–12, trips      |
| kick_dropkick    | 20     | no   | Airborne, hitbox frames 8–14   |
| kick_stomp       | 14     | no   | Downward, hitbox frames 6–10   |
| block_stand      | 4      | hold | Startup then hold              |
| block_crouch     | 4      | hold | Low guard                      |
| block_air        | 4      | hold | Aerial guard                   |
| dash_forward     | 8      | no   | I-frames 2–5                   |
| hit_stagger      | 10     | no   | Knockback reaction             |
| hit_launch       | 15     | no   | Airborne reaction              |
| knockdown        | 20     | no   | Floor bounce, get-up           |
| limp_walk        | 30     | yes  | Leg injured walk cycle         |
| crawl            | 20     | yes  | Both legs destroyed            |
| cardiac_arrest   | 70     | no   | Hidden boss death sequence     |
```

Mutations with unique movesets (e.g., CRAWLER) have entirely separate animation sets loaded dynamically.

---

## 6. Rendering Pipeline (`Renderer.js`)

```
Each frame:
  1. Clear canvas
  2. Apply camera transform (translate, scale)
  3. Draw arena background / ground / platforms
  4. Draw fighters via SkeletonRenderer (Y-sorted for overlap)
  5. Draw hitboxes/hurtboxes (debug mode only)
  6. Draw particles (hit sparks, dust, bone cracks)
  7. Reset camera transform
  8. Draw HUD (screen-space: HP bars, wave, score, boss bar)
```

### Skeleton Renderer (`SkeletonRenderer.js`)

Each bone is a line segment with round caps. Stick figure aesthetic.

```javascript
// Per bone:
ctx.strokeStyle = fighter.color;     // White=player, Red=enemies, tinted for mutations
ctx.lineWidth = bone.thickness;      // 3-5px base, scales with mutation
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(bone.worldStart.x, bone.worldStart.y);
ctx.lineTo(bone.worldEnd.x, bone.worldEnd.y);
ctx.stroke();

// Head: filled circle at head bone endpoint
// Hands/feet: small filled circles at bone tips
// Broken bones: darker color, dashed stroke, crack particles at break point
// Damaged bones (<50% structural HP): intermittent dashes, occasional red flicker
```

Skeleton mirrors horizontally based on facing direction. Enemy tint/glow changes based on mutations and generation.

### Injury Rendering (`InjuryRenderer.js`)

```
Healthy bone:      ─────────────────    Normal color, solid line
Damaged bone:      ───── ─ ─────────    Hairline cracks, subtle red flicker
Broken bone:       ╲                    Ragdoll, dark color, dangles
                    ╲                   Crack particles at break point
Dislocated joint:  ─────    ╲           Gap at joint, child hangs wrong
Spine damage:      Fighter hunches, pulsing red tint (internal bleed)
```

### Camera (`Camera.js`)

- Follows midpoint between player and nearest enemy
- Smooth LERP tracking (`CAMERA_LERP: 0.1`)
- Zooms out when fighters are far apart
- Zooms out further for boss fights
- Screen shake on heavy hits, bone breaks, giant landings

### Particle System (`ParticleSystem.js`)

- **Hit spark**: 5–10 particle burst at impact, short lifespan
- **Dust puff**: On landing, dashing, knockdown
- **Block flash**: Brief white flash on successful block
- **Bone crack**: Sharp particles on bone break, lingers briefly
- **Joint pop**: Small directional burst on dislocation
- **Mutation auras**: Per-mutation persistent effects (BERSERKER rage glow, VOLATILE sparks)

---

## 7. Configuration (`config.js`)

All magic numbers centralized for rapid iteration:

```javascript
export const CONFIG = {
    // Physics
    GRAVITY: 1.5,
    GROUND_FRICTION: 0.05,
    AIR_FRICTION: 0.01,

    // Fighter defaults
    PLAYER_HP: 100,
    ENEMY_BASE_HP: 60,
    MOVE_SPEED: 5,
    JUMP_FORCE: -12,
    DASH_SPEED: 10,
    DASH_DURATION: 8,              // frames
    DASH_COOLDOWN: 30,             // frames
    DASH_IFRAMES: [2, 5],          // invincible frames 2 through 5

    // Combat
    COMBO_BUFFER_WINDOW: 600,      // ms
    COMBO_BUFFER_SIZE: 8,
    COMBO_CHAIN_WINDOW: 12,        // frames to chain next hit
    BLOCK_DAMAGE_REDUCTION: 0.8,   // standing block: 80% reduction
    AIR_BLOCK_REDUCTION: 0.5,      // air block: 50% reduction
    BLOCK_KB_REDUCTION: 0.2,       // blocking reduces KB to 20%
    BLOCK_STRUCTURAL_NEGATION: 1.0,// blocking negates ALL structural damage
    HITSTUN_BASE: 10,              // frames
    HIT_CANCEL_WINDOW: 4,          // frames early recovery on hit
    WHIFF_RECOVERY_PENALTY: 1.2,   // +20% recovery on miss

    // Combo scaling
    COMBO_SCALE: [1.0, 0.9, 0.8, 0.7, 0.6, 0.5],  // hit 1-6+
    STRUCTURAL_SCALES_WITH_COMBO: false,              // structural dmg always full

    // Wall mechanics
    WALL_SLIDE_SPEED_MULT: 0.3,    // 30% of normal fall speed
    WALL_SLIDE_MAX_DURATION: 120,  // frames
    WALL_JUMP_FORCE: 14,           // 1.2x normal jump
    WALL_JUMP_VECTOR: { x: 0.7, y: -0.7 },
    WALL_JUMP_GRACE: 6,            // frames after leaving wall
    WALL_JUMP_CHAIN_DECAY: 0.85,   // each successive wall jump is 85% height
    WALL_JUMP_MAX_CHAIN: 5,        // max wall jumps before ground reset
    WALL_SLIDE_ENTRY_WINDOW: 10,   // grace frames for wall slide start

    // Movement
    AIR_CONTROL: 0.6,             // air drift speed as fraction of ground speed
    FAST_FALL_AIR_CONTROL: 0.4,   // reduced air control during fast fall
    AIR_ATTACK_DRIFT: 0.2,        // minimal drift during air attacks
    FLOAT_GRAVITY_MULT: 0.3,      // holding W in air = 30% gravity
    FAST_FALL_GRAVITY_MULT: 2.5,  // pressing S in air = 250% gravity
    JUMP_BUFFER: 6,               // frames before landing
    COYOTE_TIME: 6,               // frames after walking off edge

    // NEAT
    NEAT_POPULATION_SIZE: 40,
    NEAT_ELITISM: 0.15,
    NEAT_MUTATION_RATE: 0.3,
    NEAT_CROSSOVER_RATE: 0.5,
    DEAD_POOL_THRESHOLD: 6,       // evolve after this many deaths
    SENSOR_COUNT_BASE: 20,        // base inputs (before mutation additions)
    OUTPUT_COUNT_BASE: 8,         // base outputs (before mutation additions)
    STRUCTURAL_SENSOR_COUNT: 8,   // injury awareness inputs

    // Waves
    KILLS_TO_ADVANCE_BASE: 8,
    KILLS_SCALE_PER_WAVE: 2,      // +2 kills needed per wave
    HP_SCALE_PER_WAVE: 0.1,
    DAMAGE_SCALE_PER_WAVE: 0.05,
    SPEED_SCALE_PER_WAVE: 0.02,
    BOSS_EVERY_N_WAVES: 5,
    BOSS_HP_MULT: 3.0,

    // Rendering
    CANVAS_WIDTH: 960,
    CANVAS_HEIGHT: 540,
    DEBUG_HITBOXES: false,
    DEBUG_HURTBOXES: false,
    DEBUG_STRUCTURAL: false,
    CAMERA_LERP: 0.1,

    // Player structural bonuses
    PLAYER_BONE_HP_MULT: 1.5,
    PLAYER_JOINT_HP_MULT: 1.5,
    PLAYER_STRUCTURAL_HEAL_ON_BOSS: true,
};
```

---

## 8. Arena Layout (`Arena.js`)

```
┌─────────────────────────────────────────────┐
│                                             │
│  ████                              ████     │
│  █  █                              █  █     │  ← Walls (static bodies)
│  █  █    ┌──────────────┐          █  █     │
│  █  █    │   Platform   │          █  █     │  ← One-way platform
│  █  █    └──────────────┘          █  █     │     (pass through from below)
│  █  █                              █  █     │
│  █  █                              █  █     │
│  ████████████████████████████████████████   │  ← Ground (static body)
└─────────────────────────────────────────────┘

Arena width:  ~800-1200 game units
Wall height:  Full arena height (enables wall climbing)
Platform:     Optional, one-way collision (pass up, land on top)
```

Walls are core combat geometry: players use them for wall slides, wall jumps, and triangle jumping to gain height. Enemies can learn to use walls through NEAT.
