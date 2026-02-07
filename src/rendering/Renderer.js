import { CONFIG } from '../config.js';

export class Renderer {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;

        canvas.width = CONFIG.CANVAS_WIDTH;
        canvas.height = CONFIG.CANVAS_HEIGHT;
    }

    clear() {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(arena, fighters, interpolation) {
        this.clear();

        this.camera.applyTransform(this.ctx);

        this.drawArena(arena);

        for (const fighter of fighters) {
            fighter.draw(this.ctx, interpolation);
        }

        this.camera.resetTransform(this.ctx);

        this.drawHUD(fighters);
    }

    drawArena(arena) {
        const ctx = this.ctx;

        // Ground
        ctx.fillStyle = '#444';
        ctx.fillRect(
            0,
            CONFIG.GROUND_Y,
            CONFIG.ARENA_WIDTH,
            CONFIG.ARENA_HEIGHT - CONFIG.GROUND_Y
        );

        // Left wall
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, CONFIG.WALL_THICKNESS, CONFIG.ARENA_HEIGHT);

        // Right wall
        ctx.fillRect(
            CONFIG.ARENA_WIDTH - CONFIG.WALL_THICKNESS,
            0,
            CONFIG.WALL_THICKNESS,
            CONFIG.ARENA_HEIGHT
        );

        // Platform
        ctx.fillStyle = '#555';
        const platX = (CONFIG.ARENA_WIDTH - CONFIG.PLATFORM_WIDTH) / 2;
        ctx.fillRect(platX, CONFIG.PLATFORM_Y, CONFIG.PLATFORM_WIDTH, CONFIG.PLATFORM_HEIGHT);

        // Ground line highlight
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CONFIG.WALL_THICKNESS, CONFIG.GROUND_Y);
        ctx.lineTo(CONFIG.ARENA_WIDTH - CONFIG.WALL_THICKNESS, CONFIG.GROUND_Y);
        ctx.stroke();
    }

    drawHUD(fighters) {
        const ctx = this.ctx;
        const player = fighters.find(f => f.isPlayer);
        if (!player) return;

        // HP bar background
        ctx.fillStyle = '#333';
        ctx.fillRect(20, 20, 200, 16);

        // HP bar fill
        const hpRatio = Math.max(0, player.hp / player.maxHp);
        ctx.fillStyle = hpRatio > 0.3 ? '#4a4' : '#a44';
        ctx.fillRect(20, 20, 200 * hpRatio, 16);

        // HP bar border
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.strokeRect(20, 20, 200, 16);

        // HP text
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(`HP: ${Math.ceil(player.hp)}`, 24, 33);
    }
}
