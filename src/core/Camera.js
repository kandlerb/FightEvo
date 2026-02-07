import { CONFIG } from '../config.js';

export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.scale = 1;
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeMagnitude = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
    }

    follow(targetX, targetY) {
        this.targetX = targetX - CONFIG.CANVAS_WIDTH / 2;
        this.targetY = targetY - CONFIG.CANVAS_HEIGHT / 2;
    }

    update(dt) {
        const lerp = CONFIG.CAMERA_LERP;
        this.x += (this.targetX - this.x) * lerp;
        this.y += (this.targetY - this.y) * lerp;

        // Clamp to arena bounds
        this.x = Math.max(0, Math.min(this.x, CONFIG.ARENA_WIDTH - CONFIG.CANVAS_WIDTH));
        this.y = Math.max(0, Math.min(this.y, CONFIG.ARENA_HEIGHT - CONFIG.CANVAS_HEIGHT));

        // Screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const intensity = this.shakeMagnitude * (this.shakeTimer / this.shakeDuration);
            this.shakeX = (Math.random() - 0.5) * 2 * intensity;
            this.shakeY = (Math.random() - 0.5) * 2 * intensity;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
    }

    shake(magnitude, duration) {
        this.shakeMagnitude = magnitude;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    applyTransform(ctx) {
        ctx.save();
        ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
        ctx.scale(this.scale, this.scale);
    }

    resetTransform(ctx) {
        ctx.restore();
    }
}
