import { CONFIG } from '../config.js';
import { TraitSystem } from './TraitSystem.js';

/**
 * Applies mutation effects to an enemy's skeleton, physics, and stats.
 * Called once at spawn time — living enemies are never modified.
 *
 * Resolution order:
 * 1. Sum axis values from all mutations
 * 2. Compute derived stats via TraitSystem
 * 3. Apply bone length/thickness changes
 * 4. Apply stat multipliers to fighter
 * 5. Apply special mutation overrides
 */
export class BodyModifier {
    /**
     * Apply mutations to a fighter.
     * @param {Fighter} fighter
     * @param {object[]} mutations - array of mutation definitions
     * @returns {object} derivedStats for reference
     */
    static apply(fighter, mutations) {
        if (!mutations || mutations.length === 0) return null;

        // 1. Sum axis shifts
        const axes = TraitSystem.sumAxes(mutations);

        // 2. Compute derived stats
        const stats = TraitSystem.computeStats(axes);

        // 3. Apply bone changes to skeleton
        if (fighter.skeleton) {
            BodyModifier._applyBoneChanges(fighter.skeleton, mutations);
        }

        // 4. Apply stat multipliers
        BodyModifier._applyStats(fighter, stats, mutations);

        // 5. Apply special mutation effects
        BodyModifier._applySpecials(fighter, mutations, stats);

        return stats;
    }

    /**
     * Modify bone lengths and thicknesses based on mutation boneChanges.
     */
    static _applyBoneChanges(skeleton, mutations) {
        for (const mut of mutations) {
            if (!mut.boneChanges) continue;

            // Handle _all wildcard (GIANT, PARASITE)
            if (mut.boneChanges._all) {
                const changes = mut.boneChanges._all;
                for (const bone of Object.values(skeleton.bones)) {
                    if (bone.length === 0) continue; // skip root
                    if (changes.lengthMult) bone.length *= changes.lengthMult;
                    if (changes.thicknessMult) bone.thickness *= changes.thicknessMult;
                }
            }

            // Handle per-bone changes
            for (const [boneName, changes] of Object.entries(mut.boneChanges)) {
                if (boneName === '_all') continue;
                const bone = skeleton.bones[boneName];
                if (!bone) continue;

                if (changes.lengthMult) bone.length *= changes.lengthMult;
                if (changes.thicknessMult) bone.thickness *= changes.thicknessMult;
            }
        }
    }

    /**
     * Apply derived stats to fighter's HP, speed, damage, etc.
     */
    static _applyStats(fighter, stats, mutations) {
        // HP: scale by maxHP derived stat
        fighter.maxHp *= stats.maxHP;
        fighter.hp = fighter.maxHp;

        // Speed multipliers (stacked on top of structural penalties)
        fighter._baseMoveSpeedMult = stats.moveSpeed * stats.movePenalty;
        fighter._baseAttackSpeedMult = stats.attackSpeed;
        fighter._baseDamageMult = stats.baseDamage;
        fighter._damageReduction = stats.damageReduction;
        fighter._knockbackResist = stats.knockbackResist;

        // Structural HP adjustments
        if (fighter.structural) {
            for (const [boneName, state] of Object.entries(fighter.structural.boneHP)) {
                state.max *= stats.boneHPMult;
                state.current = state.max;
            }
            for (const [jointKey, state] of Object.entries(fighter.structural.jointHP)) {
                state.max *= stats.jointHPMult;
                state.current = state.max;
            }
        }

        // Store stats reference on fighter
        fighter.mutationStats = stats;
    }

    /**
     * Apply special mutation-specific effects.
     */
    static _applySpecials(fighter, mutations, stats) {
        for (const mut of mutations) {
            if (!mut.special) continue;

            // BERSERKER: set flag for dynamic scaling
            if (mut.special.rageScaling) {
                fighter._berserkerMode = true;
            }

            // Block prevention
            if (mut.special.noBlock) {
                fighter._canBlock = false;
            }

            // Dash prevention
            if (mut.special.noDash) {
                fighter._canDash = false;
            }

            // REGEN: HP per second
            if (mut.special.regenPerSec) {
                fighter._regenPerSec = (fighter._regenPerSec || 0) + mut.special.regenPerSec;
            }

            // SPRINGY: jump multiplier
            if (mut.special.jumpMult) {
                fighter.jumpMult *= mut.special.jumpMult;
            }

            // THICK_SKULL: head damage reduction
            if (mut.special.headDamageReduction) {
                fighter._headDamageReduction = mut.special.headDamageReduction;
            }

            // THICK_SKULL / MULTI_HEAD: hitstun reduction
            if (mut.special.hitstunReduction) {
                fighter._hitstunReduction = (fighter._hitstunReduction || 0) + mut.special.hitstunReduction;
                fighter._hitstunReduction = Math.min(fighter._hitstunReduction, 0.8); // cap
            }

            // STRETCHY: bone/joint HP overrides (applied after trait stats)
            if (mut.special.boneHPOverride && fighter.structural) {
                for (const state of Object.values(fighter.structural.boneHP)) {
                    state.max *= mut.special.boneHPOverride / stats.boneHPMult;
                    state.current = state.max;
                }
            }
            if (mut.special.jointHPOverride && fighter.structural) {
                for (const state of Object.values(fighter.structural.jointHP)) {
                    state.max *= mut.special.jointHPOverride / stats.jointHPMult;
                    state.current = state.max;
                }
            }

            // VOLATILE: store explosion data
            if (mut.special.explodeOnDeath) {
                fighter._explodeOnDeath = {
                    radius: mut.special.explosionRadius,
                    damage: mut.special.explosionDamage,
                };
            }

            // SPLIT: store split data
            if (mut.special.splitOnDeath) {
                fighter._splitOnDeath = {
                    count: mut.special.splitCount,
                    scale: mut.special.splitScale,
                    hpMult: mut.special.splitHP,
                    damageMult: mut.special.splitDamage,
                };
            }

            // VENOMOUS: store venom data
            if (mut.special.venomDPS) {
                fighter._venomData = {
                    dps: mut.special.venomDPS,
                    duration: mut.special.venomDuration,
                };
            }

            // HEAVY_LEGS: kick damage bonus
            if (mut.special.kickDamageMult) {
                fighter._kickDamageMult = mut.special.kickDamageMult;
            }
        }
    }
}
