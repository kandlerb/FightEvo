import { Fighter } from './Fighter.js';
import { MovementController } from '../movement/MovementController.js';
import { CONFIG } from '../config.js';

export class Player extends Fighter {
    constructor(x, y, inputManager) {
        super(x, y, {
            isPlayer: true,
            color: '#fff',
            hp: CONFIG.PLAYER_HP,
        });

        this.inputManager = inputManager;
        this.movement = new MovementController(this, inputManager);
    }

    update(dt) {
        this.facingDirection = this.inputManager.facingDirection;

        // Movement (disabled during hitstun)
        if (!this.combat || this.combat.hitstunFrames === 0) {
            this.movement.update(dt);
        }

        // Combat inputs
        this._handleCombatInput();

        super.update(dt);
    }

    _handleCombatInput() {
        if (!this.combat) return;
        const input = this.inputManager;

        // Block (L key)
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

        // Punch (J key)
        if (input.wasPressed('j')) {
            const dir = input.getComboDirection();
            this.combat.bufferAttack('punch', dir);
        }

        // Kick (K key)
        if (input.wasPressed('k')) {
            const dir = input.getComboDirection();
            this.combat.bufferAttack('kick', dir);
        }
    }
}
