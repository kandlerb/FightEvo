export class InputManager {
    constructor() {
        this.keysDown = {};
        this.keysPressed = {};
        this.keysReleased = {};
        this.facingDirection = 1;  // 1 = right, -1 = left
        this.facingLocked = false;
        this.moveDirection = 0;    // -1, 0, or 1

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
    }

    init() {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }

    _onKeyDown(e) {
        const key = this._normalizeKey(e.key);
        if (!this.keysDown[key]) {
            this.keysPressed[key] = true;
        }
        this.keysDown[key] = true;
        e.preventDefault();
    }

    _onKeyUp(e) {
        const key = this._normalizeKey(e.key);
        this.keysDown[key] = false;
        this.keysReleased[key] = true;
        e.preventDefault();
    }

    _normalizeKey(key) {
        return key.toLowerCase();
    }

    update() {
        const movingLeft = this.isDown('a');
        const movingRight = this.isDown('d');
        const shiftHeld = this.isDown('shift');

        this.facingLocked = shiftHeld;
        if (!this.facingLocked) {
            if (movingRight && !movingLeft) this.facingDirection = 1;
            if (movingLeft && !movingRight) this.facingDirection = -1;
        }

        this.moveDirection = 0;
        if (movingRight) this.moveDirection += 1;
        if (movingLeft) this.moveDirection -= 1;
    }

    postUpdate() {
        this.keysPressed = {};
        this.keysReleased = {};
    }

    isDown(key) {
        return !!this.keysDown[key];
    }

    wasPressed(key) {
        return !!this.keysPressed[key];
    }

    wasReleased(key) {
        return !!this.keysReleased[key];
    }

    /** Get combo direction relative to facing (for combo system) */
    getComboDirection() {
        if (this.moveDirection === this.facingDirection) return 'forward';
        if (this.moveDirection === -this.facingDirection) return 'back';
        if (this.isDown('w')) return 'up';
        if (this.isDown('s')) return 'down';
        return 'neutral';
    }
}
