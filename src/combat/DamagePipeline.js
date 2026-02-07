import Matter from 'matter-js';
import { CONFIG } from '../config.js';
import { DAMAGE_ZONES } from './DamageZones.js';

/**
 * Resolves a hit from collision data into HP damage, knockback, hitstun,
 * and structural integrity damage (bone breaks, joint dislocations).
 */
export class DamagePipeline {
    /**
     * Resolve a hit.
     * @param {Fighter} attacker
     * @param {Fighter} defender
     * @param {object} move - the move definition
     * @param {string} zone - damage zone name (from hurtbox)
     * @param {number} comboScale - damage scaling from combo count
     * @param {string} boneName - specific bone that was hit
     * @returns {object} result with hpDamage, knockback, hitstun, structural applied
     */
    static resolve(attacker, defender, move, zone, comboScale, boneName) {
        const zoneData = DAMAGE_ZONES[zone] || DAMAGE_ZONES.torso;

        // Check blocking
        const isBlocking = defender.isBlocking;
        let blockReduction = 0;
        let kbReduction = 1;
        let blocked = false;

        if (isBlocking) {
            const blockType = defender.blockType;

            // Check if block covers this attack height
            blocked = DamagePipeline._doesBlockCover(blockType, move.attackHeight);

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

        // Structural damage
        let structuralResult = { boneBreak: null, jointDislocate: null };
        if (defender.structural && boneName) {
            // Blocked hits negate structural damage based on config
            const structBlockMult = blocked ? (1 - CONFIG.BLOCK_STRUCTURAL_NEGATION) : 1;

            if (structBlockMult > 0) {
                const structMult = zoneData.structMult || 1;
                const structBonus = move.structBonus || 1.0;
                // Structural damage does NOT scale with combo by default
                const structComboScale = CONFIG.STRUCTURAL_SCALES_WITH_COMBO ? comboScale : 1.0;

                structuralResult = defender.structural.applyDamage(
                    boneName, baseDmg * structComboScale, structMult * structBlockMult, structBonus
                );

                // Handle break/dislocation consequences
                if (defender.limbDamage) {
                    if (structuralResult.boneBreak) {
                        defender.limbDamage.onBoneBreak(structuralResult.boneBreak);
                    }
                    if (structuralResult.jointDislocate) {
                        defender.limbDamage.onJointDislocate(structuralResult.jointDislocate);
                    }
                }
            }
        }

        return {
            hpDamage,
            knockback: { x: kbX * direction, y: kbY },
            hitstun,
            zone,
            boneName,
            blocked,
            boneBreak: structuralResult.boneBreak,
            jointDislocate: structuralResult.jointDislocate,
        };
    }

    static _doesBlockCover(blockType, attackHeight) {
        if (blockType === 'air') return true; // air block covers everything
        if (blockType === 'stand') return attackHeight === 'high' || attackHeight === 'mid';
        if (blockType === 'crouch') return attackHeight === 'mid' || attackHeight === 'low';
        return false;
    }
}
