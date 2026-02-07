/**
 * Fighter state FSM. Determines the current state based on fighter flags,
 * and maps states to animation names.
 */

export const FighterState = {
    IDLE: 'IDLE',
    WALKING_FORWARD: 'WALKING_FORWARD',
    WALKING_BACKWARD: 'WALKING_BACKWARD',
    JUMPING: 'JUMPING',
    FLOATING: 'FLOATING',
    FAST_FALLING: 'FAST_FALLING',
    LANDING: 'LANDING',
    CROUCHING: 'CROUCHING',
    SLIDING: 'SLIDING',
    WALL_SLIDING: 'WALL_SLIDING',
    DASHING: 'DASHING',
};

const STATE_TO_ANIM = {
    [FighterState.IDLE]: 'idle',
    [FighterState.WALKING_FORWARD]: 'walk_forward',
    [FighterState.WALKING_BACKWARD]: 'walk_backward',
    [FighterState.JUMPING]: 'jump_rise',
    [FighterState.FLOATING]: 'jump_float',
    [FighterState.FAST_FALLING]: 'fast_fall',
    [FighterState.LANDING]: 'jump_land',
    [FighterState.CROUCHING]: 'crouch',
    [FighterState.SLIDING]: 'slide',
    [FighterState.WALL_SLIDING]: 'wall_slide',
    [FighterState.DASHING]: 'dash_forward',
};

export class StateManager {
    constructor(fighter) {
        this.fighter = fighter;
        this.state = FighterState.IDLE;
        this.prevState = FighterState.IDLE;
        this.landingFrames = 0;
    }

    update(dt) {
        this.prevState = this.state;
        this.state = this._determineState();
    }

    get stateChanged() {
        return this.state !== this.prevState;
    }

    get animationName() {
        return STATE_TO_ANIM[this.state] || 'idle';
    }

    _determineState() {
        const f = this.fighter;

        // Landing takes priority for a few frames
        if (this.landingFrames > 0) {
            this.landingFrames--;
            return FighterState.LANDING;
        }

        // Detect landing transition
        if (this.prevState === FighterState.JUMPING ||
            this.prevState === FighterState.FLOATING ||
            this.prevState === FighterState.FAST_FALLING) {
            if (f.isGrounded) {
                this.landingFrames = 5;
                return FighterState.LANDING;
            }
        }

        // Dashing
        if (f.movement && f.movement.dashFrames > 0) {
            return FighterState.DASHING;
        }

        // Wall sliding
        if (f.isWallSliding) {
            return FighterState.WALL_SLIDING;
        }

        // Airborne states
        if (!f.isGrounded) {
            if (f.isFastFalling) return FighterState.FAST_FALLING;
            if (f.isFloating) return FighterState.FLOATING;
            return FighterState.JUMPING;
        }

        // Ground states
        if (f.isCrouching) {
            // Sliding: crouching while moving
            if (f.body && Math.abs(f.body.velocity.x) > 2) {
                return FighterState.SLIDING;
            }
            return FighterState.CROUCHING;
        }

        if (f.body && Math.abs(f.body.velocity.x) > 0.5) {
            // Determine forward vs backward walking
            const movingInFacingDir = (f.body.velocity.x > 0 && f.facingDirection === 1) ||
                                      (f.body.velocity.x < 0 && f.facingDirection === -1);
            return movingInFacingDir ? FighterState.WALKING_FORWARD : FighterState.WALKING_BACKWARD;
        }

        return FighterState.IDLE;
    }
}
