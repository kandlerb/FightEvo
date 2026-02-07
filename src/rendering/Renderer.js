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

        // Draw particles in world space
        if (stats && stats.particles) {
            stats.particles.draw(this.ctx);
        }

        // Draw damage numbers in world space
        if (stats && stats.damageNumbers) {
            this._drawDamageNumbers(this.ctx, stats.damageNumbers);
        }

        this.camera.resetTransform(this.ctx);

        this.drawHUD(fighters, stats);

        // Screen effects and overlays
        if (stats) {
            this._drawLowHPVignette(stats.playerHPRatio);
            this._drawOverlays(stats);
        }
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

        // Boss HP bar (full-width at top) or enemy HP bars
        if (stats && stats.boss && stats.waveState === 'BOSS_FIGHT') {
            this._drawBossHPBar(ctx, stats.boss);
        } else {
            const enemies = fighters.filter(f => !f.isPlayer);
            for (let i = 0; i < enemies.length; i++) {
                const barX = CONFIG.CANVAS_WIDTH - 220;
                const barY = 20 + i * 28;
                const enemy = enemies[i];

                let label = `E${i + 1}`;
                if (enemy.mutations && enemy.mutations.length > 0) {
                    const mutNames = enemy.mutations.map(m => m.name).join('+');
                    label += ` [${mutNames}]`;
                }

                const barColor = (enemy.mutations && enemy.mutations.length > 0)
                    ? (enemy.color || '#a44')
                    : '#a44';

                this._drawHPBar(ctx, barX, barY, 200, 14, enemy, barColor, label);
            }
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

            const tier = stats.waveTier || '';
            ctx.fillText(`WAVE ${stats.wave}  ${tier}`, midX, 16);

            ctx.fillStyle = '#777';
            if (stats.waveState === 'BOSS_FIGHT') {
                ctx.fillText(
                    `BOSS FIGHT  |  Gen ${stats.generation}  |  Total: ${stats.totalKills}`,
                    midX, 32
                );
            } else {
                ctx.fillText(
                    `Kills: ${stats.killsThisWave}/${stats.killsToAdvance}  |  Gen ${stats.generation}  |  Total: ${stats.totalKills}`,
                    midX, 32
                );
            }
            ctx.textAlign = 'left';
        }

        // Controls hint (bottom center, subtle)
        ctx.fillStyle = '#444';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WASD move  J punch  K kick  L block  Space dash  ESC pause', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 8);
        ctx.textAlign = 'left';
    }

    /**
     * Draw floating damage numbers in world space.
     */
    _drawDamageNumbers(ctx, numbers) {
        for (const dn of numbers) {
            const alpha = dn.life / dn.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(dn.text, dn.x, dn.y);
            ctx.textAlign = 'left';
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Low HP vignette — red border darkening when player HP is low.
     */
    _drawLowHPVignette(hpRatio) {
        if (hpRatio >= 0.3) return;

        const ctx = this.ctx;
        const intensity = (0.3 - hpRatio) / 0.3; // 0 at 30%, 1 at 0%
        const alpha = intensity * 0.4;

        // Red tint overlay at edges (vignette)
        const gradient = ctx.createRadialGradient(
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2,
            CONFIG.CANVAS_WIDTH * 0.3,
            CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2,
            CONFIG.CANVAS_WIDTH * 0.7
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(100, 0, 0, ${alpha})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }

    /**
     * Draw boss HP bar — full width at screen top with name plate.
     */
    _drawBossHPBar(ctx, boss) {
        const margin = 60;
        const barX = margin;
        const barY = 50;
        const barW = CONFIG.CANVAS_WIDTH - margin * 2;
        const barH = 20;

        // Background
        ctx.fillStyle = '#222';
        ctx.fillRect(barX, barY, barW, barH);

        // Fill
        const hpRatio = Math.max(0, boss.hp / boss.maxHp);
        if (hpRatio > 0) {
            ctx.fillStyle = hpRatio > 0.3 ? '#ffd700' : '#a44';
            ctx.fillRect(barX, barY, barW * hpRatio, barH);
        }

        // Border
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // Boss name plate
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        const bossName = boss.bossName || 'BOSS';
        ctx.fillText(bossName, CONFIG.CANVAS_WIDTH / 2, barY - 6);

        // HP text
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(`${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`, CONFIG.CANVAS_WIDTH / 2, barY + 15);
        ctx.textAlign = 'left';
    }

    /**
     * Draw overlays (boss intro, wave transition, pause, game over).
     */
    _drawOverlays(stats) {
        const ctx = this.ctx;
        const midX = CONFIG.CANVAS_WIDTH / 2;
        const midY = CONFIG.CANVAS_HEIGHT / 2;

        // Boss intro overlay
        if (stats.waveState === 'BOSS_INTRO') {
            const progress = stats.introProgress || 0;

            const alpha = Math.min(progress * 2, 0.7);
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

            if (progress > 0.3) {
                const textAlpha = Math.min((progress - 0.3) / 0.3, 1);
                ctx.globalAlpha = textAlpha;

                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 48px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('BOSS', midX, midY - 20);

                ctx.fillStyle = '#fff';
                ctx.font = '16px monospace';
                ctx.fillText(`Wave ${stats.wave}`, midX, midY + 20);

                ctx.textAlign = 'left';
                ctx.globalAlpha = 1;
            }
        }

        // Wave transition overlay
        if (stats.waveState === 'WAVE_TRANSITION') {
            const progress = stats.transitionProgress || 0;

            const alpha = progress < 0.5
                ? progress * 0.4
                : (1 - progress) * 0.4;

            if (alpha > 0.01) {
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            }

            if (progress < 0.7) {
                const textAlpha = progress < 0.5 ? progress * 2 : (0.7 - progress) * 5;
                ctx.globalAlpha = Math.max(0, textAlpha);

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 28px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`WAVE ${stats.wave}`, midX, midY);

                const tier = stats.waveTier || '';
                ctx.fillStyle = '#aaa';
                ctx.font = '14px monospace';
                ctx.fillText(tier, midX, midY + 24);

                ctx.textAlign = 'left';
                ctx.globalAlpha = 1;
            }
        }

        // Pause menu overlay
        if (stats.isPaused) {
            ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.PAUSE_OVERLAY_ALPHA})`;
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 32px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', midX, midY - 30);

            ctx.fillStyle = '#aaa';
            ctx.font = '14px monospace';
            ctx.fillText('Press ESC to resume', midX, midY + 10);

            ctx.fillStyle = '#777';
            ctx.font = '12px monospace';
            ctx.fillText('WASD move | J punch | K kick | L block | Space dash', midX, midY + 40);

            ctx.textAlign = 'left';
        }

        // Game over overlay
        if (stats.gameState === 'GAME_OVER') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

            ctx.fillStyle = '#f44';
            ctx.font = 'bold 36px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', midX, midY - 20);

            ctx.fillStyle = '#fff';
            ctx.font = '16px monospace';
            ctx.fillText(
                `Wave ${stats.wave}  |  ${stats.totalKills} Kills  |  Gen ${stats.generation}`,
                midX, midY + 20
            );
            ctx.textAlign = 'left';
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
