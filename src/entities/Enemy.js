import { Fighter } from './Fighter.js';
import { MovementController } from '../movement/MovementController.js';
import { CONFIG } from '../config.js';
import { NeatAgent } from '../ai/NeatAgent.js';

/**
 * NEAT-controlled enemy fighter.
 * Uses a NeatAgent (genome + sensors + virtual inputs) to drive the same
 * MovementController and CombatController as the player.
 */
export class Enemy extends Fighter {
    constructor(x, y, genome) {
        super(x, y, {
            isPlayer: false,
            color: '#f44',
            hp: CONFIG.ENEMY_BASE_HP,
        });

        this.agent = new NeatAgent(genome);
        this.movement = new MovementController(this, this.agent.inputSource);
        this.facingDirection = -1; // default face left toward player
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

        // Movement (disabled during hitstun)
        if (!this.combat || this.combat.hitstunFrames === 0) {
            this.movement.update(dt);
        }

        // Combat inputs from AI
        this._handleCombatInput();

        super.update(dt);
    }

    /**
     * Read AI virtual inputs for combat actions (same logic as Player).
     */
    _handleCombatInput() {
        if (!this.combat || !this.agent) return;
        const input = this.agent.inputSource;

        // Block (virtual L key)
        if (input.isDown('l') && !this.combat.comboSystem.currentMove) {
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
}
