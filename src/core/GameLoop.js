import { CONFIG } from '../config.js';

export class GameLoop {
    constructor(game) {
        this.game = game;
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedDt = CONFIG.FIXED_DT;
        this.running = false;
        this._boundLoop = this._loop.bind(this);
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.accumulator = 0;
        requestAnimationFrame(this._boundLoop);
    }

    stop() {
        this.running = false;
    }

    _loop(timestamp) {
        if (!this.running) return;

        const elapsed = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Cap accumulator to prevent spiral of death
        this.accumulator += Math.min(elapsed, 200);

        while (this.accumulator >= this.fixedDt) {
            this.game.update(this.fixedDt);
            this.accumulator -= this.fixedDt;
        }

        const interpolation = this.accumulator / this.fixedDt;
        this.game.render(interpolation);

        requestAnimationFrame(this._boundLoop);
    }
}
