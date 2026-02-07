import { Fighter } from './Fighter.js';
import { CONFIG } from '../config.js';

/**
 * Basic enemy fighter. For Phase 3 this is a stationary dummy
 * that stands in place and can be hit. NEAT AI comes in Phase 5.
 */
export class Enemy extends Fighter {
    constructor(x, y) {
        super(x, y, {
            isPlayer: false,
            color: '#f44',
            hp: CONFIG.ENEMY_BASE_HP,
        });

        this.facingDirection = -1; // face left toward player
    }

    update(dt) {
        // Dummy: no AI, just stand and face the player
        super.update(dt);
    }
}
