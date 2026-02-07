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
        this.movement.update(dt);
        super.update(dt);
    }
}
