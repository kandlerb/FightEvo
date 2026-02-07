import { CONFIG } from '../config.js';
import { BONE_PROPERTIES } from './BoneProperties.js';
import { JOINT_PROPERTIES } from './JointProperties.js';

/**
 * Tracks per-bone and per-joint structural HP for a fighter.
 * Calculates structural damage from attacks and triggers breaks/dislocations.
 */
export class StructuralSystem {
    constructor(fighter) {
        this.fighter = fighter;
        this.boneHP = {};
        this.jointHP = {};
        this.brokenBones = new Set();
        this.dislocatedJoints = new Set();

        this._initHP();
    }

    _initHP() {
        const hpMult = this.fighter.isPlayer ? CONFIG.PLAYER_BONE_HP_MULT : 1;
        const jointMult = this.fighter.isPlayer ? CONFIG.PLAYER_JOINT_HP_MULT : 1;

        for (const [boneName, props] of Object.entries(BONE_PROPERTIES)) {
            this.boneHP[boneName] = {
                current: props.structHP * hpMult,
                max: props.structHP * hpMult,
            };
        }

        for (const [jointKey, props] of Object.entries(JOINT_PROPERTIES)) {
            this.jointHP[jointKey] = {
                current: props.dislocateHP * jointMult,
                max: props.dislocateHP * jointMult,
            };
        }
    }

    /**
     * Apply structural damage to a bone and its parent joint.
     * Called from DamagePipeline when a hit connects.
     * @param {string} boneName - the bone that was hit
     * @param {number} attackDamage - base damage of the attack
     * @param {number} structMult - zone structural multiplier
     * @param {number} structBonus - move structural bonus (default 1.0)
     * @returns {{boneBreak: string|null, jointDislocate: string|null}}
     */
    applyDamage(boneName, attackDamage, structMult, structBonus = 1.0) {
        const result = { boneBreak: null, jointDislocate: null };

        if (this.brokenBones.has(boneName)) return result;

        const boneProps = BONE_PROPERTIES[boneName];
        if (!boneProps) return result;

        // Bone damage: damage * (1 - hardness) / density * zoneMult * bonus
        const boneDmg = attackDamage * (1 - boneProps.hardness) / boneProps.density
                        * structMult * structBonus;

        const boneState = this.boneHP[boneName];
        if (boneState) {
            boneState.current -= boneDmg;
            if (boneState.current <= 0) {
                boneState.current = 0;
                result.boneBreak = boneName;
                this.brokenBones.add(boneName);
            }
        }

        // Joint damage: apply to the joint connecting this bone to its parent
        const bone = this.fighter.skeleton?.bones[boneName];
        if (bone && bone.parent) {
            const jointKey = `${bone.parent.name}_${boneName}`;
            const jointProps = JOINT_PROPERTIES[jointKey];
            const jointState = this.jointHP[jointKey];

            if (jointProps && jointState && !this.dislocatedJoints.has(jointKey)) {
                const jointDmg = (attackDamage * structMult * structBonus) / jointProps.strength;
                jointState.current -= jointDmg;
                if (jointState.current <= 0) {
                    jointState.current = 0;
                    result.jointDislocate = jointKey;
                    this.dislocatedJoints.add(jointKey);
                }
            }
        }

        return result;
    }

    /**
     * Check if a bone is functional (not broken, not under a dislocated joint).
     */
    isBoneFunctional(boneName) {
        if (this.brokenBones.has(boneName)) return false;

        // Check if any ancestor joint is dislocated
        const bone = this.fighter.skeleton?.bones[boneName];
        if (!bone) return true;

        let current = bone;
        while (current.parent) {
            const jointKey = `${current.parent.name}_${current.name}`;
            if (this.dislocatedJoints.has(jointKey)) return false;
            current = current.parent;
        }

        return true;
    }

    /**
     * Get the HP ratio for a bone (0-1).
     */
    getBoneHPRatio(boneName) {
        const state = this.boneHP[boneName];
        if (!state) return 1;
        return state.current / state.max;
    }

    /**
     * Count broken leg bones (thigh, shin, foot on each side).
     */
    getLegDamageState() {
        const leftLegBones = ['thighL', 'shinL', 'footL'];
        const rightLegBones = ['thighR', 'shinR', 'footR'];

        let leftBroken = 0;
        let rightBroken = 0;

        for (const b of leftLegBones) {
            if (!this.isBoneFunctional(b)) leftBroken++;
        }
        for (const b of rightLegBones) {
            if (!this.isBoneFunctional(b)) rightBroken++;
        }

        const leftDamaged = leftBroken > 0;
        const rightDamaged = rightBroken > 0;

        if (leftDamaged && rightDamaged) return 'NO_LEGS';
        if (leftBroken >= 2 || rightBroken >= 2) return 'LEG_DESTROYED';
        if (leftDamaged || rightDamaged) return 'LEG_INJURED';
        return 'HEALTHY';
    }

    /**
     * Count broken arm bones.
     */
    getArmDamageState() {
        const leftArmBones = ['upperArmL', 'forearmL', 'handL'];
        const rightArmBones = ['upperArmR', 'forearmR', 'handR'];

        const leftFunctional = leftArmBones.some(b => this.isBoneFunctional(b));
        const rightFunctional = rightArmBones.some(b => this.isBoneFunctional(b));

        if (!leftFunctional && !rightFunctional) return 'NO_ARMS';
        if (!leftFunctional || !rightFunctional) return 'ARM_INJURED';
        return 'HEALTHY';
    }

    /**
     * Check critical structures.
     */
    isSpineBroken() {
        return this.brokenBones.has('spine') ||
               this.dislocatedJoints.has('hip_spine');
    }

    isNeckBroken() {
        return this.brokenBones.has('neck') ||
               this.dislocatedJoints.has('spine_neck');
    }

    /**
     * Reset all structural HP (e.g., before boss fights).
     */
    reset() {
        this.brokenBones.clear();
        this.dislocatedJoints.clear();
        this._initHP();
    }
}
