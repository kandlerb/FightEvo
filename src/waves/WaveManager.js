import { CONFIG } from '../config.js';

/**
 * Wave state machine managing wave progression, boss fights, and transitions.
 *
 * Sub-states:
 *   WAVE_ACTIVE      — Normal gameplay, enemies spawn and die
 *   WAVE_TRANSITION   — Brief pause between waves
 *   BOSS_INTRO        — Screen darkens, "BOSS" text, dramatic pause
 *   BOSS_FIGHT        — Single boss enemy, no respawns
 */

const WaveState = {
    WAVE_ACTIVE: 'WAVE_ACTIVE',
    WAVE_TRANSITION: 'WAVE_TRANSITION',
    BOSS_INTRO: 'BOSS_INTRO',
    BOSS_FIGHT: 'BOSS_FIGHT',
};

export { WaveState };

export class WaveManager {
    constructor() {
        this.wave = 1;
        this.state = WaveState.WAVE_ACTIVE;

        // Kill tracking
        this.killsThisWave = 0;
        this.killsToAdvance = CONFIG.KILLS_TO_ADVANCE_BASE;
        this.totalKills = 0;

        // Respawn control
        this.respawnTimer = 0;

        // Transition timers
        this._transitionTimer = 0;
        this._introTimer = 0;

        // Boss tracking
        this.boss = null;
        this.bossWave = false; // true if the NEXT wave should be a boss fight
    }

    /**
     * Check if the next wave advancement triggers a boss.
     */
    _isBossWave(waveNumber) {
        return waveNumber > 0 && waveNumber % CONFIG.BOSS_EVERY_N_WAVES === 0;
    }

    /**
     * Get the wave tier name for display.
     */
    getWaveTier() {
        if (this.wave <= 2) return 'LEARNING';
        if (this.wave <= 5) return 'ADAPTING';
        if (this.wave <= 9) return 'THREATENING';
        if (this.wave <= 14) return 'DANGEROUS';
        return 'NIGHTMARE';
    }

    /**
     * Max concurrent enemies for current wave.
     */
    getMaxEnemies() {
        if (this.state === WaveState.BOSS_FIGHT) return 0; // no regular enemies during boss
        if (this.state === WaveState.BOSS_INTRO) return 0;
        if (this.state === WaveState.WAVE_TRANSITION) return 0;

        if (this.wave <= 2) return 2;
        if (this.wave <= 5) return 3;
        if (this.wave <= 9) return 4;
        if (this.wave <= 14) return 5;
        return 5 + Math.floor((this.wave - 14) / 3);
    }

    /**
     * Respawn delay in frames.
     */
    getRespawnDelay() {
        if (this.wave <= 2) return 180;  // 3s
        if (this.wave <= 5) return 120;  // 2s
        if (this.wave <= 9) return 90;   // 1.5s
        if (this.wave <= 14) return 60;  // 1s
        return 30;                       // 0.5s
    }

    /**
     * Enemy stat multiplier for current wave.
     */
    getStatMultiplier() {
        return 1 + (this.wave - 1) * CONFIG.HP_SCALE_PER_WAVE;
    }

    /**
     * Damage multiplier for current wave.
     */
    getDamageMultiplier() {
        return 1 + (this.wave - 1) * CONFIG.DAMAGE_SCALE_PER_WAVE;
    }

    /**
     * Speed multiplier for current wave.
     */
    getSpeedMultiplier() {
        return 1 + (this.wave - 1) * CONFIG.SPEED_SCALE_PER_WAVE;
    }

    /**
     * Register a kill. Returns action needed:
     *   'continue'  — stay in current wave
     *   'advance'   — advance to next wave (may trigger boss)
     */
    registerKill() {
        this.totalKills++;
        this.killsThisWave++;

        if (this.killsThisWave >= this.killsToAdvance) {
            return 'advance';
        }
        return 'continue';
    }

    /**
     * Begin wave transition. Called when kill threshold reached.
     * If next wave is a boss wave, goes to BOSS_INTRO instead.
     */
    beginAdvance() {
        const nextWave = this.wave + 1;

        if (this._isBossWave(nextWave)) {
            // Advance wave number, then enter boss intro
            this.wave = nextWave;
            this.killsThisWave = 0;
            this.killsToAdvance = CONFIG.KILLS_TO_ADVANCE_BASE + (this.wave - 1) * CONFIG.KILLS_SCALE_PER_WAVE;
            this.state = WaveState.BOSS_INTRO;
            this._introTimer = CONFIG.BOSS_INTRO_FRAMES;
            this.bossWave = true;
            return 'boss_intro';
        }

        // Normal wave transition
        this.wave = nextWave;
        this.killsThisWave = 0;
        this.killsToAdvance = CONFIG.KILLS_TO_ADVANCE_BASE + (this.wave - 1) * CONFIG.KILLS_SCALE_PER_WAVE;
        this.state = WaveState.WAVE_TRANSITION;
        this._transitionTimer = CONFIG.WAVE_TRANSITION_FRAMES;
        return 'transition';
    }

    /**
     * Start the boss fight (called after intro completes).
     */
    beginBossFight(boss) {
        this.boss = boss;
        this.state = WaveState.BOSS_FIGHT;
    }

    /**
     * Boss defeated. Return to normal waves.
     */
    bossDefeated() {
        this.boss = null;
        this.bossWave = false;
        this.state = WaveState.WAVE_TRANSITION;
        this._transitionTimer = CONFIG.WAVE_TRANSITION_FRAMES;
    }

    /**
     * Per-frame update for transition/intro timers.
     * Returns events: 'intro_done', 'transition_done', or null.
     */
    update() {
        if (this.state === WaveState.BOSS_INTRO) {
            this._introTimer--;
            if (this._introTimer <= 0) {
                return 'intro_done';
            }
        }

        if (this.state === WaveState.WAVE_TRANSITION) {
            this._transitionTimer--;
            if (this._transitionTimer <= 0) {
                this.state = WaveState.WAVE_ACTIVE;
                this.respawnTimer = 0;
                return 'transition_done';
            }
        }

        return null;
    }

    /**
     * Check if enemies should respawn (only during WAVE_ACTIVE).
     */
    shouldRespawn(currentEnemyCount) {
        if (this.state !== WaveState.WAVE_ACTIVE) return false;
        if (currentEnemyCount >= this.getMaxEnemies()) return false;

        this.respawnTimer++;
        if (this.respawnTimer >= this.getRespawnDelay()) {
            this.respawnTimer = 0;
            return true;
        }
        return false;
    }

    /**
     * Get intro progress (0→1) for animation.
     */
    getIntroProgress() {
        if (this.state !== WaveState.BOSS_INTRO) return 0;
        return 1 - (this._introTimer / CONFIG.BOSS_INTRO_FRAMES);
    }

    /**
     * Get transition progress (0→1) for animation.
     */
    getTransitionProgress() {
        if (this.state !== WaveState.WAVE_TRANSITION) return 0;
        return 1 - (this._transitionTimer / CONFIG.WAVE_TRANSITION_FRAMES);
    }

    /**
     * Stats object for HUD display.
     */
    getStats(generation, enemyCount, gameState) {
        return {
            wave: this.wave,
            waveTier: this.getWaveTier(),
            generation,
            totalKills: this.totalKills,
            killsThisWave: this.killsThisWave,
            killsToAdvance: this.killsToAdvance,
            enemyCount,
            gameState,
            waveState: this.state,
            introProgress: this.getIntroProgress(),
            transitionProgress: this.getTransitionProgress(),
            boss: this.boss,
            bossWave: this.bossWave,
        };
    }
}
