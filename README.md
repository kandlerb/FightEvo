# Fight EVO

A 2D arena survival fighting game where enemies are controlled by neural networks that evolve via NEAT (NeuroEvolution of Augmenting Topologies). The longer you survive, the smarter and more mutated the enemies become.

## Concept

You're dropped into an arena. Enemies spawn continuously. They fight you. They die. They evolve. New enemies spawn smarter than the last. The twist: evolution isn't just brains — enemies develop physical mutations. Extra arms. Armored plating. One might crawl on all fours. Another might explode when it dies. Their bones can break. Their joints can pop. And so can yours.

Last as long as you can.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Physics | Matter.js |
| Rendering | HTML5 Canvas (2D Context) |
| AI / Evolution | NEAT (neataptic or custom) |
| Animation | Custom skeleton / bone system |
| Input | Keyboard event listeners |
| Build | Vite (or plain ES modules for prototyping) |

## Controls

```
W       Jump / Float (hold in air) / Wall Jump
A/D     Move left/right / Wall slide (hold into wall)
S       Crouch / Fast fall / Slide (while moving)
J       Punch (contextual — changes with stance/state)
K       Kick (contextual — changes with stance/state)
L       Block (standing/crouch/air variants)
Space   Dash (directional, based on WASD held)
Shift   Lock facing direction (attack backward while retreating)
ESC     Pause menu
```

See `fight-evo-input-mapping.md` for the complete input × state matrix.

## Project Documents

| Document | Contents |
|----------|----------|
| `README.md` | This file — overview, setup, controls |
| `fight-evo-input-mapping.md` | Every key mapped against every game state |
| `ARCHITECTURE.md` | Project structure, core systems, game loop, rendering pipeline |
| `GAME_DESIGN.md` | Combat, mutations, bosses, wave progression, combo system |
| `TECHNICAL_SPEC.md` | NEAT AI, structural integrity, damage pipeline, physics, trait system |

## Project Structure

```
fight-evo/
├── index.html
├── src/
│   ├── main.js                    # Entry point, game loop bootstrap
│   ├── config.js                  # All tuning knobs in one place
│   │
│   ├── core/
│   │   ├── Game.js                # Top-level state machine
│   │   ├── GameLoop.js            # Fixed-timestep update loop
│   │   ├── InputManager.js        # Key state, combo buffer, facing
│   │   └── Camera.js              # Viewport follow, zoom
│   │
│   ├── physics/
│   │   ├── PhysicsWorld.js        # Matter.js engine wrapper
│   │   ├── CollisionHandler.js    # Collision categories, hit events
│   │   └── PhysicsConfig.js       # Gravity, friction, constants
│   │
│   ├── entities/
│   │   ├── Fighter.js             # Base fighter (shared player & AI)
│   │   ├── Player.js              # Extends Fighter, wired to input
│   │   ├── Enemy.js               # Extends Fighter, wired to NEAT
│   │   └── Boss.js                # Extends Enemy, boss-specific logic
│   │
│   ├── skeleton/
│   │   ├── Skeleton.js            # Bone hierarchy
│   │   ├── Bone.js                # Position, rotation, length, mode
│   │   ├── Pose.js                # Snapshot of all bone transforms
│   │   ├── Animation.js           # Keyframe sequence + interpolation
│   │   └── AnimationLibrary.js    # Named animation registry
│   │
│   ├── combat/
│   │   ├── HitboxManager.js       # Bone-anchored attack hitboxes
│   │   ├── HurtboxManager.js      # Bone-anchored passive hurtboxes
│   │   ├── ComboSystem.js         # Input buffer → move resolution
│   │   ├── MoveSet.js             # Move definitions (frames, damage)
│   │   ├── DamageZones.js         # Zone multipliers and weak spots
│   │   ├── DamagePipeline.js      # Full hit resolution flow
│   │   └── StateManager.js        # Fighter state FSM
│   │
│   ├── structural/
│   │   ├── StructuralSystem.js    # Bone HP, joint HP, break detection
│   │   ├── BoneProperties.js      # Density, thickness, hardness
│   │   ├── JointProperties.js     # Strength, dislocation thresholds
│   │   ├── LimbDamageHandler.js   # Break/dislocation consequences
│   │   └── InjuryRenderer.js      # Cracks, ragdoll limbs, visual
│   │
│   ├── mutations/
│   │   ├── MutationCatalog.js     # All mutation definitions
│   │   ├── MutationInstance.js    # Runtime mutation on specific enemy
│   │   ├── MutationData.js        # Raw mutation config objects
│   │   ├── BodyModifier.js        # Apply skeleton/physics/stat changes
│   │   ├── MutationRenderer.js    # Tints, glow, particles per mutation
│   │   ├── TraitSystem.js         # Axis-based trade-off calculator
│   │   └── HiddenMutations.js     # Cardiac arrest and future hidden traits
│   │
│   ├── ai/
│   │   ├── EvolutionManager.js    # Continuous death-driven evolution
│   │   ├── NeatAgent.js           # Single genome → fighter controller
│   │   ├── FitnessEvaluator.js    # Scoring function
│   │   ├── SensorArray.js         # Neural net inputs
│   │   └── BossFactory.js         # Boss genome/mutation selection
│   │
│   ├── arena/
│   │   ├── Arena.js               # Stage geometry, boundaries
│   │   └── WaveManager.js         # Spawning, kill-count waves
│   │
│   ├── movement/
│   │   ├── WallSystem.js          # Wall slide, wall jump, chain tracking
│   │   ├── MovementController.js  # Ground movement, jump, dash
│   │   └── MovementStates.js      # Injured movement states
│   │
│   └── rendering/
│       ├── Renderer.js            # Canvas draw orchestrator
│       ├── SkeletonRenderer.js    # Bone → stick figure drawing
│       ├── DebugRenderer.js       # Hitbox/hurtbox/physics overlays
│       ├── HUD.js                 # HP bars, wave counter, score
│       └── ParticleSystem.js      # Hit sparks, dust, effects
│
├── assets/
│   └── (sound files if any)
│
└── lib/
    └── neataptic.min.js
```

## Implementation Phases

| Phase | Focus | Milestone |
|-------|-------|-----------|
| 1 | Core loop, physics, basic movement | Player walks and jumps in arena |
| 2 | Skeleton animation system | Smooth animated stick figures |
| 3 | Combat, combos, hitboxes | Player combos against a dummy |
| 4 | Structural integrity, weak spots | Limbs break, joints pop |
| 5 | NEAT AI, continuous evolution | Enemies fight back and improve |
| 6 | Mutations, trait system | Visible enemy mutations |
| 7 | Waves, bosses, game flow | Complete playable game loop |
| 8 | Polish, effects, audio | Particles, screen shake, sound |
