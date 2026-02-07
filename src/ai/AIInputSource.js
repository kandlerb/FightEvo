/**
 * Virtual input manager for AI-controlled fighters.
 * Implements the same interface as InputManager so that
 * MovementController, CombatController, and ComboSystem
 * work identically for both player and AI.
 *
 * Neural network outputs (8 values, 0-1 sigmoid) are mapped
 * to virtual key presses each frame.
 */
export class AIInputSource {
    constructor() {
        this._keys = {};
        this._pressed = {};
        this._prevKeys = {};
        this.moveDirection = 0;
        this.facingDirection = 1;
    }

    /**
     * Update virtual inputs from neural network outputs.
     * @param {Float64Array} outputs - 8 sigmoid outputs from NEAT network
     *   [0] move_left  → 'a'
     *   [1] move_right → 'd'
     *   [2] jump       → 'w'
     *   [3] crouch     → 's'
     *   [4] punch      → 'j'
     *   [5] kick       → 'k'
     *   [6] block      → 'l'
     *   [7] dash       → ' '
     */
    setOutputs(outputs) {
        // Save previous state for edge detection
        this._prevKeys = { ...this._keys };

        const KEY_MAP = ['a', 'd', 'w', 's', 'j', 'k', 'l', ' '];
        const threshold = 0.5;

        this._keys = {};
        this._pressed = {};

        for (let i = 0; i < KEY_MAP.length; i++) {
            const key = KEY_MAP[i];
            const active = outputs[i] > threshold;
            this._keys[key] = active;

            // Edge detection: pressed this frame but not last frame
            if (active && !this._prevKeys[key]) {
                this._pressed[key] = true;
            }
        }

        // Movement direction
        this.moveDirection = 0;
        if (this._keys['d']) this.moveDirection += 1;
        if (this._keys['a']) this.moveDirection -= 1;

        // AI facing follows movement (no shift-lock)
        if (this.moveDirection !== 0) {
            this.facingDirection = this.moveDirection;
        }
    }

    /** Is key currently held? */
    isDown(key) {
        return !!this._keys[key];
    }

    /** Was key just pressed this frame? */
    wasPressed(key) {
        return !!this._pressed[key];
    }

    /** Get combo direction relative to facing. */
    getComboDirection() {
        if (this.moveDirection === this.facingDirection) return 'forward';
        if (this.moveDirection === -this.facingDirection) return 'back';
        if (this._keys['w']) return 'up';
        if (this._keys['s']) return 'down';
        return 'neutral';
    }
}
