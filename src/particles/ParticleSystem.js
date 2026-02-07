import { CONFIG } from '../config.js';

/**
 * Lightweight particle system for visual effects.
 * Manages a pool of particles and provides factory methods
 * for common effects (hit sparks, dust, block flash, bone cracks).
 */

class Particle {
    constructor() {
        this.alive = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 0;
        this.size = 2;
        this.color = '#fff';
        this.gravity = 0;
        this.friction = 1;
        this.shrink = true;
    }

    init(x, y, vx, vy, life, opts = {}) {
        this.alive = true;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.size = opts.size || 2;
        this.color = opts.color || '#fff';
        this.gravity = opts.gravity || 0;
        this.friction = opts.friction || 1;
        this.shrink = opts.shrink !== false;
    }

    update(dt) {
        if (!this.alive) return;

        const s = dt / 1000;
        this.x += this.vx * s;
        this.y += this.vy * s;
        this.vy += this.gravity * s;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.life -= dt;

        if (this.life <= 0) {
            this.alive = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        const t = this.life / this.maxLife; // 1→0
        const alpha = t;
        const size = this.shrink ? this.size * t : this.size;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
        ctx.globalAlpha = 1;
    }
}

export class ParticleSystem {
    constructor() {
        this.pool = [];
        this.maxParticles = CONFIG.PARTICLE_MAX_POOL || 300;

        // Pre-allocate pool
        for (let i = 0; i < this.maxParticles; i++) {
            this.pool.push(new Particle());
        }
    }

    _getParticle() {
        for (const p of this.pool) {
            if (!p.alive) return p;
        }
        return null; // pool exhausted
    }

    _emit(x, y, vx, vy, life, opts) {
        const p = this._getParticle();
        if (p) p.init(x, y, vx, vy, life, opts);
    }

    /**
     * Per-frame update.
     */
    update(dt) {
        for (const p of this.pool) {
            if (p.alive) p.update(dt);
        }
    }

    /**
     * Draw all alive particles.
     */
    draw(ctx) {
        for (const p of this.pool) {
            if (p.alive) p.draw(ctx);
        }
    }

    // ─── Factory methods ────────────────────────────────────

    /**
     * Hit spark burst at impact point.
     */
    hitSpark(x, y, direction) {
        const count = CONFIG.PARTICLE_HIT_SPARK_COUNT || 8;
        const life = CONFIG.PARTICLE_HIT_SPARK_LIFE || 300;
        const colors = ['#ff8', '#fa0', '#ff4', '#fff'];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 160;
            const vx = Math.cos(angle) * speed + direction * 40;
            const vy = Math.sin(angle) * speed;
            const color = colors[Math.floor(Math.random() * colors.length)];

            this._emit(x, y, vx, vy, life + Math.random() * 100, {
                size: 2 + Math.random() * 2,
                color,
                gravity: 200,
                friction: 0.98,
            });
        }
    }

    /**
     * Block flash — brief white particles at impact.
     */
    blockFlash(x, y) {
        const count = 5;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 60;
            this._emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 150, {
                size: 3 + Math.random() * 2,
                color: '#fff',
                gravity: 0,
                friction: 0.95,
            });
        }
    }

    /**
     * Dust puff at ground level (landing, dashing).
     */
    dustPuff(x, y) {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const vx = (Math.random() - 0.5) * 80;
            const vy = -(Math.random() * 30 + 10);
            this._emit(x, y, vx, vy, 400 + Math.random() * 200, {
                size: 3 + Math.random() * 3,
                color: '#777',
                gravity: 20,
                friction: 0.97,
            });
        }
    }

    /**
     * Bone crack particles — sharp red burst.
     */
    boneCrack(x, y) {
        const count = 10;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 100;
            this._emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 600 + Math.random() * 200, {
                size: 2 + Math.random() * 2,
                color: i < 5 ? '#f44' : '#a22',
                gravity: 150,
                friction: 0.97,
            });
        }
    }

    /**
     * Joint pop — small directional burst.
     */
    jointPop(x, y) {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 60;
            this._emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 350, {
                size: 2,
                color: '#f88',
                gravity: 100,
                friction: 0.96,
            });
        }
    }

    /**
     * Explosion burst (VOLATILE death).
     */
    explosion(x, y, radius) {
        const count = 25;
        const colors = ['#f80', '#ff4', '#fa0', '#f44', '#ff0'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 200;
            const color = colors[Math.floor(Math.random() * colors.length)];
            this._emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 500 + Math.random() * 300, {
                size: 3 + Math.random() * 4,
                color,
                gravity: 100,
                friction: 0.97,
            });
        }
    }

    /**
     * Death burst (enemy dies).
     */
    deathBurst(x, y, color) {
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            this._emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 400 + Math.random() * 200, {
                size: 2 + Math.random() * 2,
                color: color || '#f44',
                gravity: 200,
                friction: 0.97,
            });
        }
    }

    /**
     * Boss defeat celebration — gold particles.
     */
    bossDefeat(x, y) {
        const count = 30;
        const colors = ['#ffd700', '#ff0', '#ffa500', '#fff'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 200;
            const color = colors[Math.floor(Math.random() * colors.length)];
            this._emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 700 + Math.random() * 400, {
                size: 3 + Math.random() * 3,
                color,
                gravity: 80,
                friction: 0.98,
            });
        }
    }

    /**
     * Get count of alive particles (for debug).
     */
    getAliveCount() {
        let count = 0;
        for (const p of this.pool) {
            if (p.alive) count++;
        }
        return count;
    }
}
