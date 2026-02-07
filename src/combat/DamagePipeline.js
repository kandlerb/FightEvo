import Matter from 'matter-js';
import { CONFIG } from '../config.js';
import { DAMAGE_ZONES } from './DamageZones.js';

/**
 * Resolves a hit from collision data into HP damage, knockback, and hitstun.
 * Structural integrity damage is deferred to Phase 4.
 */
export class DamagePipeline {
    /**
     * Resolve a hit.
     * @param {Fighter} attacker
     * @param {Fighter} defender
     * @param {object} move - the move definition
     * @param {string} zone - damage zone name (from hurtbox)
     * @param {number} comboScale - damage scaling from combo count
     * @returns {object} result with hpDamage, knockback, hitstun applied
     */
    static resolve(attacker, defender, move, zone, comboScale) {
        const zoneData = DAMAGE_ZONES[zone] || DAMAGE_ZONES.torso;

        // Check blocking
        const isBlocking = defender.isBlocking;
        let blockReduction = 0;
        let kbReduction = 1;

        if (isBlocking) {
            const blockType = defender.blockType;

            // Check if block covers this attack height
            const blocked = DamagePipeline._doesBlockCover(blockType, move.attackHeight);

            if (blocked) {
                if (blockType === 'air') {
                    blockReduction = CONFIG.AIR_BLOCK_REDUCTION;
                    kbReduction = 1; // full KB on air block
                } else {
                    blockReduction = CONFIG.BLOCK_DAMAGE_REDUCTION;
                    kbReduction = CONFIG.BLOCK_KB_REDUCTION;
                }
            }
        }

        // HP damage
        const baseDmg = move.damage;
        const hpDamage = baseDmg * zoneData.hpMult * comboScale * (1 - blockReduction);

        // Knockback
        const kbX = move.knockback.x * zoneData.kbMult * kbReduction;
        const kbY = move.knockback.y * zoneData.kbMult * kbReduction;
        const direction = attacker.facingDirection;

        // Hitstun
        const hitstun = Math.round(move.hitstun * zoneData.stunMult);

        // Apply HP
        defender.hp -= hpDamage;
        defender.hp = Math.max(0, defender.hp);

        // Apply knockback
        Matter.Body.setVelocity(defender.body, {
            x: kbX * direction,
            y: kbY,
        });

        // Apply hitstun
        if (defender.combat) {
            defender.combat.enterHitstun(hitstun);
        }

        return {
            hpDamage,
            knockback: { x: kbX * direction, y: kbY },
            hitstun,
            zone,
            blocked: blockReduction > 0,
        };
    }

    static _doesBlockCover(blockType, attackHeight) {
        if (blockType === 'air') return true; // air block covers everything
        if (blockType === 'stand') return attackHeight === 'high' || attackHeight === 'mid';
        if (blockType === 'crouch') return attackHeight === 'mid' || attackHeight === 'low';
        return false;
    }
}
