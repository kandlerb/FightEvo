import { ComboSystem } from './ComboSystem.js';
import { HitboxManager } from './HitboxManager.js';
import { HurtboxManager } from './HurtboxManager.js';

/**
 * Per-fighter combat controller. Owns the combo system, hitbox manager,
 * and hurtbox manager. Provides a unified combat update.
 */
export class CombatController {
    constructor(fighter) {
        this.fighter = fighter;
        this.comboSystem = new ComboSystem(fighter);
        this.hitboxManager = new HitboxManager(fighter);
        this.hurtboxManager = new HurtboxManager(fighter);

        this.hitstunFrames = 0;
    }

    update() {
        // Tick hitstun
        if (this.hitstunFrames > 0) {
            this.hitstunFrames--;
            this.hurtboxManager.update();
            return;
        }

        // Update combo system (advances current move frame)
        const result = this.comboSystem.update();

        // Update hitboxes based on current move and frame
        if (result.move) {
            this.hitboxManager.update(result.move, result.frame);
        } else {
            this.hitboxManager.update(null, 0);
            this.hitboxManager.resetHitList();
        }

        // Always update hurtboxes
        this.hurtboxManager.update();
    }

    /**
     * Buffer an attack input.
     */
    bufferAttack(action, direction) {
        // Can't attack during hitstun
        if (this.hitstunFrames > 0) return;
        this.comboSystem.bufferInput(action, direction);
    }

    /**
     * Enter hitstun — interrupts current attack.
     */
    enterHitstun(frames) {
        this.hitstunFrames = frames;
        this.comboSystem.reset();
        this.hitboxManager.activeHitboxes = [];
        this.hitboxManager.resetHitList();
    }

    /**
     * Confirm the current attack hit.
     */
    confirmHit() {
        this.comboSystem.confirmHit();
    }

    /**
     * Get current combo damage scale.
     */
    getDamageScale() {
        return this.comboSystem.getDamageScale();
    }
}
