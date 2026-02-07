import Matter from 'matter-js';
import { CONFIG } from '../config.js';

export class MovementController {
    constructor(fighter, inputSource) {
        this.fighter = fighter;
        this.input = inputSource;

        this.coyoteFrames = 0;
        this.jumpBufferFrames = 0;
        this.wallJumpChain = 0;
        this.wallSlideFrames = 0;
        this.dashFrames = 0;
        this.dashCooldown = 0;
    }

    update(dt) {
        const f = this.fighter;
        const body = f.body;
        const vel = body.velocity;

        this._updateTimers();
        this._handleHorizontalMovement(vel);
        this._handleJump(vel);
        this._handleWallSlide(vel);
        this._handleCrouch();
        this._handleDash(vel);
        this._handleFastFall(vel);
        this._handleFloat(vel);
    }

    _updateTimers() {
        const f = this.fighter;

        // Coyote time
        if (f.isGrounded) {
            this.coyoteFrames = CONFIG.COYOTE_TIME;
            this.wallJumpChain = 0;
        } else {
            this.coyoteFrames = Math.max(0, this.coyoteFrames - 1);
        }

        // Jump buffer
        if (this.input.wasPressed('w')) {
            this.jumpBufferFrames = CONFIG.JUMP_BUFFER;
        } else {
            this.jumpBufferFrames = Math.max(0, this.jumpBufferFrames - 1);
        }

        // Dash cooldown
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.dashFrames > 0) this.dashFrames--;

        // Wall slide timer
        if (f.isTouchingWall && !f.isGrounded) {
            this.wallSlideFrames++;
        } else {
            this.wallSlideFrames = 0;
        }
    }

    _handleHorizontalMovement(vel) {
        const f = this.fighter;
        if (this.dashFrames > 0) return;

        const dir = this.input.moveDirection;
        if (dir === 0) return;

        let speed = CONFIG.MOVE_SPEED * (f.speedMult || 1.0);

        if (!f.isGrounded) {
            speed *= CONFIG.AIR_CONTROL;
        }

        Matter.Body.setVelocity(f.body, {
            x: dir * speed,
            y: vel.y,
        });
    }

    _handleJump(vel) {
        const f = this.fighter;
        const canJump = this.coyoteFrames > 0 && !f.isCrouching;
        const wantsJump = this.jumpBufferFrames > 0;

        const jumpMult = f.jumpMult || 1.0;
        if (jumpMult <= 0) {
            // Can't jump at all (both legs destroyed)
            this.jumpBufferFrames = 0;
            return;
        }

        if (canJump && wantsJump) {
            this.jumpBufferFrames = 0;
            this.coyoteFrames = 0;

            Matter.Body.setVelocity(f.body, {
                x: vel.x,
                y: CONFIG.JUMP_FORCE * jumpMult,
            });
            return;
        }

        // Wall jump
        if (wantsJump && jumpMult > 0 && f.isTouchingWall && !f.isGrounded &&
            this.wallJumpChain < CONFIG.WALL_JUMP_MAX_CHAIN) {

            this.jumpBufferFrames = 0;
            this.wallJumpChain++;

            const decay = Math.pow(CONFIG.WALL_JUMP_CHAIN_DECAY, this.wallJumpChain - 1);
            const force = CONFIG.WALL_JUMP_FORCE * decay * jumpMult;
            const awayFromWall = -f.wallDirection;

            Matter.Body.setVelocity(f.body, {
                x: awayFromWall * CONFIG.WALL_JUMP_VECTOR.x * force,
                y: CONFIG.WALL_JUMP_VECTOR.y * force,
            });
        }
    }

    _handleWallSlide(vel) {
        const f = this.fighter;

        if (f.isTouchingWall && !f.isGrounded && vel.y > 0 &&
            this.wallSlideFrames < CONFIG.WALL_SLIDE_MAX_DURATION) {

            // Hold direction into wall to wall slide
            const holdingIntoWall = (f.wallDirection === -1 && this.input.isDown('a')) ||
                                    (f.wallDirection === 1 && this.input.isDown('d'));

            if (holdingIntoWall) {
                f.isWallSliding = true;
                const maxSlideSpeed = CONFIG.MOVE_SPEED * CONFIG.WALL_SLIDE_SPEED_MULT;
                if (vel.y > maxSlideSpeed) {
                    Matter.Body.setVelocity(f.body, {
                        x: vel.x,
                        y: maxSlideSpeed,
                    });
                }
                return;
            }
        }

        f.isWallSliding = false;
    }

    _handleCrouch() {
        const f = this.fighter;
        f.isCrouching = f.isGrounded && this.input.isDown('s');
    }

    _handleDash(vel) {
        const f = this.fighter;

        if (this.input.wasPressed(' ') && this.dashCooldown === 0) {
            this.dashFrames = CONFIG.DASH_DURATION;
            this.dashCooldown = CONFIG.DASH_COOLDOWN;

            let dashDir = this.input.moveDirection || f.facingDirection;

            Matter.Body.setVelocity(f.body, {
                x: dashDir * CONFIG.DASH_SPEED,
                y: f.isGrounded ? 0 : vel.y * 0.5,
            });
        }

        if (this.dashFrames > 0) {
            // Maintain dash velocity
            const dashDir = vel.x > 0 ? 1 : -1;
            Matter.Body.setVelocity(f.body, {
                x: dashDir * CONFIG.DASH_SPEED,
                y: f.isGrounded ? 0 : vel.y,
            });
        }
    }

    _handleFastFall(vel) {
        const f = this.fighter;
        if (!f.isGrounded && this.input.isDown('s') && vel.y >= 0) {
            f.isFastFalling = true;
        } else {
            f.isFastFalling = false;
        }
    }

    _handleFloat(vel) {
        const f = this.fighter;
        if (!f.isGrounded && this.input.isDown('w') && vel.y > 0 && !f.isFastFalling) {
            f.isFloating = true;
        } else {
            f.isFloating = false;
        }
    }
}
