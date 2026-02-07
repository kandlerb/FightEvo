const FIXED_DT = 1000 / 60; // 16.67ms per update tick

export class GameLoop {
    constructor({ update, render }) {
        this._update = update;
        this._render = render;
        this._accumulator = 0;
        this._lastTime = 0;
        this._running = false;
    }

    start() {
        this._running = true;
        this._lastTime = performance.now();
        requestAnimationFrame((t) => this._loop(t));
    }

    stop() {
        this._running = false;
    }

    _loop(timestamp) {
        if (!this._running) return;

        const elapsed = timestamp - this._lastTime;
        this._lastTime = timestamp;

        // Clamp elapsed to avoid spiral of death (e.g. tab was backgrounded)
        this._accumulator += Math.min(elapsed, 200);

        while (this._accumulator >= FIXED_DT) {
            this._update(FIXED_DT);
            this._accumulator -= FIXED_DT;
        }

        const interpolation = this._accumulator / FIXED_DT;
        this._render(interpolation);

        requestAnimationFrame((t) => this._loop(t));
    }
}
