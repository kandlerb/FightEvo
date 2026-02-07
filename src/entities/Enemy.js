import { Fighter } from './Fighter.js';
import { MovementController } from '../movement/MovementController.js';
import { CONFIG } from '../config.js';
import { NeatAgent } from '../ai/NeatAgent.js';
import { BodyModifier } from '../mutations/BodyModifier.js';
import { MutationRenderer } from '../mutations/MutationRenderer.js';

/**
 * NEAT-controlled enemy fighter.
 * Uses a NeatAgent (genome + sensors + virtual inputs) to drive the same
 * MovementController and CombatController as the player.
 * Body mutations are applied at spawn via BodyModifier.
 */
export class Enemy extends Fighter {
    constructor(x, y, genome, mutations) {
        super(x, y, {
            isPlayer: false,
            color: '#f44',
            hp: CONFIG.ENEMY_BASE_HP,
        });

        this.agent = new NeatAgent(genome);
        this.movement = new MovementController(this, this.agent.inputSource);
        this.facingDirection = -1; // default face left toward player

        // Mutations (applied after skeleton + initAnimation in Game._spawnEnemy)
        this.mutations = mutations || [];
        this.mutationStats = null;
    }

    /**
     * Apply mutations after skeleton and animation are initialized.
     */
    applyMutations() {
        if (this.mutations.length > 0) {
            this.mutationStats = BodyModifier.apply(this, this.mutations);
        }
    }

    /**
     * Per-frame update: run AI then update movement + combat.
     * @param {number} dt
     * @param {Fighter} player - the player to sense
     * @param {Fighter[]} allEnemies - all living enemies
     */
    update(dt, player, allEnemies) {
        // Run neural network: sense → think → act
        if (this.agent && player) {
            this.agent.update(this, player, allEnemies || []);
            this.facingDirection = this.agent.inputSource.facingDirection;
        }

        // BERSERKER: dynamic damage/speed scaling based on missing HP
        if (this._berserkerMode) {
            const hpRatio = this.hp / this.maxHp;
            const rage = 1 - hpRatio;
            // At 10% HP: ~1.9x damage, ~1.45x speed
            this._berserkerDamageMult = 1 + rage * 0.9;
            this._berserkerSpeedMult = 1 + rage * 0.45;
        }

        // REGEN: heal over time
        if (this._regenPerSec && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this._regenPerSec * (dt / 1000));
        }

        // Movement (disabled during hitstun)
        if (!this.combat || this.combat.hitstunFrames === 0) {
            this.movement.update(dt);
        }

        // Combat inputs from AI
        this._handleCombatInput();

        // Update mutation color for rendering
        this.color = MutationRenderer.getColor('#f44', this.mutations, this);

        super.update(dt);
    }

    /**
     * Read AI virtual inputs for combat actions (same logic as Player).
     */
    _handleCombatInput() {
        if (!this.combat || !this.agent) return;
        const input = this.agent.inputSource;

        // Block (virtual L key) — BERSERKER cannot block
        if (input.isDown('l') && !this.combat.comboSystem.currentMove && this._canBlock !== false) {
            this.isBlocking = true;
            if (!this.isGrounded) {
                this.blockType = 'air';
            } else if (this.isCrouching) {
                this.blockType = 'crouch';
            } else {
                this.blockType = 'stand';
            }
        } else {
            this.isBlocking = false;
            this.blockType = null;
        }

        // Punch (virtual J key)
        if (input.wasPressed('j')) {
            const dir = input.getComboDirection();
            this.combat.bufferAttack('punch', dir);
        }

        // Kick (virtual K key)
        if (input.wasPressed('k')) {
            const dir = input.getComboDirection();
            this.combat.bufferAttack('kick', dir);
        }
    }

    /**
     * Get the final fitness score (called when this enemy dies).
     */
    getFinalFitness() {
        return this.agent ? this.agent.getFinalFitness() : 0;
    }

    /** Provide mutation render options to Skeleton.draw(). */
    _getRenderOpts() {
        if (!this.mutations || this.mutations.length === 0) return null;
        return {
            thicknessMult: MutationRenderer.getThicknessMult(this.mutations),
            outlineColor: MutationRenderer.getOutlineColor(this.mutations),
            alpha: MutationRenderer.getAlpha(this.mutations),
        };
    }
}
