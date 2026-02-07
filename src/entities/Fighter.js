import Matter from 'matter-js';
import { CONFIG } from '../config.js';
import { CATEGORY } from '../physics/PhysicsConfig.js';
import { StateManager } from '../combat/StateManager.js';
import { AnimationController } from '../skeleton/AnimationController.js';
import { CombatController } from '../combat/CombatController.js';
import { StructuralSystem } from '../structural/StructuralSystem.js';
import { LimbDamageHandler } from '../structural/LimbDamageHandler.js';

export class Fighter {
    constructor(x, y, opts = {}) {
        this.isPlayer = opts.isPlayer || false;
        this.color = opts.color || '#fff';
        this.hp = opts.hp || CONFIG.PLAYER_HP;
        this.maxHp = this.hp;

        this.facingDirection = 1;
        this.groundContacts = 0;
        this.wallContacts = 0;
        this.wallDirection = 0;

        // State flags
        this.isCrouching = false;
        this.isWallSliding = false;
        this.isFastFalling = false;
        this.isFloating = false;
        this.isBlocking = false;
        this.blockType = null; // 'stand', 'crouch', or 'air'

        // Physics body dimensions
        this.bodyWidth = 30;
        this.bodyHeight = 70;
        this.footSensorHeight = 6;

        // Skeleton & animation (assigned after creation via initAnimation)
        this.skeleton = null;
        this.stateManager = null;
        this.animController = null;

        // Combat (assigned after skeleton via initAnimation)
        this.combat = null;

        // Structural integrity (assigned after skeleton via initAnimation)
        this.structural = null;
        this.limbDamage = null;

        // Movement multipliers (set by LimbDamageHandler)
        this.speedMult = 1.0;
        this.jumpMult = 1.0;

        // Movement controller (set by subclass)
        this.movement = null;

        this._createBody(x, y);
    }

    /** Call after skeleton is assigned to wire up animation, combat, and structural systems */
    initAnimation() {
        if (!this.skeleton) return;
        this.stateManager = new StateManager(this);
        this.animController = new AnimationController(this.skeleton);
        this.combat = new CombatController(this);
        this.structural = new StructuralSystem(this);
        this.limbDamage = new LimbDamageHandler(this);
    }

    _createBody(x, y) {
        const category = this.isPlayer ? CATEGORY.PLAYER : CATEGORY.ENEMY;
        const collidesWith = CATEGORY.GROUND | CATEGORY.WALL | CATEGORY.PLATFORM |
                             (this.isPlayer ? CATEGORY.ENEMY : CATEGORY.PLAYER);

        const mainBody = Matter.Bodies.rectangle(
            x, y,
            this.bodyWidth, this.bodyHeight,
            {
                label: 'fighter',
                collisionFilter: {
                    category: category,
                    mask: collidesWith,
                },
            }
        );

        const footSensor = Matter.Bodies.rectangle(
            x, y + this.bodyHeight / 2 + this.footSensorHeight / 2,
            this.bodyWidth - 4,
            this.footSensorHeight,
            {
                label: 'footSensor',
                isSensor: true,
                collisionFilter: {
                    category: category,
                    mask: CATEGORY.GROUND | CATEGORY.PLATFORM,
                },
            }
        );
        footSensor.fighter = this;

        this.body = Matter.Body.create({
            parts: [mainBody, footSensor],
            friction: CONFIG.GROUND_FRICTION,
            frictionAir: CONFIG.AIR_FRICTION,
            restitution: 0,
            inertia: Infinity,
            inverseInertia: 0,
        });

        this.body.fighter = this;
        mainBody.fighter = this;
    }

    get isGrounded() {
        return this.groundContacts > 0;
    }

    get isTouchingWall() {
        return this.wallContacts > 0;
    }

    get x() {
        return this.body.position.x;
    }

    get y() {
        return this.body.position.y;
    }

    update(dt) {
        // Apply gravity modifiers
        if (this.isFloating) {
            const gravCompensation = CONFIG.GRAVITY * (1 - CONFIG.FLOAT_GRAVITY_MULT);
            Matter.Body.applyForce(this.body, this.body.position, {
                x: 0,
                y: -gravCompensation * this.body.mass * 0.001,
            });
        } else if (this.isFastFalling) {
            const extraGrav = CONFIG.GRAVITY * (CONFIG.FAST_FALL_GRAVITY_MULT - 1);
            Matter.Body.applyForce(this.body, this.body.position, {
                x: 0,
                y: extraGrav * this.body.mass * 0.001,
            });
        }

        // Update facing direction
        this.facingDirection = this.isPlayer ? this._playerFacing() : this.facingDirection;

        // Update combat
        if (this.combat) {
            this.combat.update();
        }

        // Update state machine and animation
        if (this.stateManager) {
            this.stateManager.update(dt);
            if (this.stateManager.stateChanged) {
                this.animController.play(this.stateManager.animationName);
            }
            this.animController.update();
        }

        // Update limb damage (spine HP drain, etc.)
        if (this.limbDamage) {
            this.limbDamage.update(dt);
        }

        // Update skeleton position if attached
        if (this.skeleton) {
            this.skeleton.setPosition(this.x, this.y + this.bodyHeight / 4);
            this.skeleton.setFacing(this.facingDirection);

            // Sync structural state to bones for rendering
            if (this.structural) {
                this._syncStructuralToBones();
            }
        }
    }

    _playerFacing() {
        return this.facingDirection;
    }

    /**
     * Sync structural HP ratios and broken state from StructuralSystem to
     * Bone objects so the Skeleton renderer can visualize damage.
     */
    _syncStructuralToBones() {
        for (const [boneName, bone] of Object.entries(this.skeleton.bones)) {
            bone.structuralHP = this.structural.getBoneHPRatio(boneName);
            bone.isBroken = this.structural.brokenBones.has(boneName);
        }
    }

    draw(ctx, interpolation) {
        if (this.skeleton) {
            this.skeleton.draw(ctx, this.color);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(
                this.x - this.bodyWidth / 2,
                this.y - this.bodyHeight / 2,
                this.bodyWidth,
                this.bodyHeight
            );
        }
    }
}
