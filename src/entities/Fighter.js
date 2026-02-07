import Matter from 'matter-js';
import { CONFIG } from '../config.js';
import { CATEGORY } from '../physics/PhysicsConfig.js';

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

        // Physics body dimensions
        this.bodyWidth = 30;
        this.bodyHeight = 70;
        this.footSensorHeight = 6;

        // Skeleton (assigned after creation)
        this.skeleton = null;

        this._createBody(x, y);
    }

    _createBody(x, y) {
        const category = this.isPlayer ? CATEGORY.PLAYER : CATEGORY.ENEMY;
        const collidesWith = CATEGORY.GROUND | CATEGORY.WALL | CATEGORY.PLATFORM |
                             (this.isPlayer ? CATEGORY.ENEMY : CATEGORY.PLAYER);

        // Main body
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

        // Foot sensor at the bottom of the body
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

        // Compound body
        this.body = Matter.Body.create({
            parts: [mainBody, footSensor],
            friction: CONFIG.GROUND_FRICTION,
            frictionAir: CONFIG.AIR_FRICTION,
            restitution: 0,
            inertia: Infinity,
            inverseInertia: 0,
        });

        // Store reference back to fighter
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

        // Update skeleton position if attached
        if (this.skeleton) {
            this.skeleton.setPosition(this.x, this.y + this.bodyHeight / 4);
            this.skeleton.setFacing(this.facingDirection);
        }
    }

    _playerFacing() {
        // This is overridden by the input manager's facing direction in Player
        return this.facingDirection;
    }

    draw(ctx, interpolation) {
        if (this.skeleton) {
            this.skeleton.draw(ctx, this.color);
        } else {
            // Fallback: draw as a rectangle
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
