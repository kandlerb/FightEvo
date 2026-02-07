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

    draw(arena, fighters, interpolation, stats) {
        this.clear();

        this.camera.applyTransform(this.ctx);

        this.drawArena(arena);

        for (const fighter of fighters) {
            fighter.draw(this.ctx, interpolation);
        }

        this.camera.resetTransform(this.ctx);

        this.drawHUD(fighters, stats);
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

    drawHUD(fighters, stats) {
        const ctx = this.ctx;
        const player = fighters.find(f => f.isPlayer);
        if (!player) return;

        // Player HP bar
        this._drawHPBar(ctx, 20, 20, 200, 16, player, '#4a4', 'Player');

        // Enemy HP bars (stack on right side)
        const enemies = fighters.filter(f => !f.isPlayer);
        for (let i = 0; i < enemies.length; i++) {
            const barX = CONFIG.CANVAS_WIDTH - 220;
            const barY = 20 + i * 22;
            this._drawHPBar(ctx, barX, barY, 200, 14, enemies[i], '#a44', `Enemy ${i + 1}`);
        }

        // Combo counter
        if (player.combat && player.combat.comboSystem.comboCount > 1) {
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 18px monospace';
            ctx.fillText(
                `${player.combat.comboSystem.comboCount} HIT`,
                20, 60
            );
        }

        // Wave / Evolution info
        if (stats) {
            ctx.fillStyle = '#aaa';
            ctx.font = '12px monospace';
            const midX = CONFIG.CANVAS_WIDTH / 2;

            ctx.textAlign = 'center';
            ctx.fillText(`WAVE ${stats.wave}`, midX, 16);

            ctx.fillStyle = '#777';
            ctx.fillText(
                `Kills: ${stats.killsThisWave}/${stats.killsToAdvance}  |  Gen ${stats.generation}  |  Total: ${stats.totalKills}`,
                midX, 32
            );
            ctx.textAlign = 'left';

            // Game over overlay
            if (stats.gameState === 'GAME_OVER') {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

                ctx.fillStyle = '#f44';
                ctx.font = 'bold 36px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('GAME OVER', midX, CONFIG.CANVAS_HEIGHT / 2 - 20);

                ctx.fillStyle = '#fff';
                ctx.font = '16px monospace';
                ctx.fillText(
                    `Wave ${stats.wave}  |  ${stats.totalKills} Kills  |  Gen ${stats.generation}`,
                    midX, CONFIG.CANVAS_HEIGHT / 2 + 20
                );
                ctx.textAlign = 'left';
            }
        }
    }

    _drawHPBar(ctx, x, y, w, h, fighter, color, label) {
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, w, h);

        // Fill
        const hpRatio = Math.max(0, fighter.hp / fighter.maxHp);
        ctx.fillStyle = hpRatio > 0.3 ? color : '#a44';
        ctx.fillRect(x, y, w * hpRatio, h);

        // Border
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        // Text
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(`${label}: ${Math.ceil(fighter.hp)}`, x + 4, y + 13);
    }
}
