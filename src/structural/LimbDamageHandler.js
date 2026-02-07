import { CONFIG } from '../config.js';

/**
 * Handles the consequences of bone breaks and joint dislocations:
 * - Switches broken bones to ragdoll mode
 * - Applies movement penalties
 * - Applies spine/neck break effects
 */
export class LimbDamageHandler {
    constructor(fighter) {
        this.fighter = fighter;
        this.spineHPDrain = 0; // HP/sec drain from spine break
    }

    /**
     * Called when a bone breaks.
     */
    onBoneBreak(boneName) {
        const skeleton = this.fighter.skeleton;
        if (!skeleton) return;

        const bone = skeleton.bones[boneName];
        if (!bone) return;

        // Set this bone and all children to ragdoll mode
        this._setRagdoll(bone);

        // Handle specific breaks
        if (boneName === 'spine') {
            this.spineHPDrain = 2; // 2 HP/sec
        }

        this._updateMovementPenalties();
    }

    /**
     * Called when a joint dislocates.
     */
    onJointDislocate(jointKey) {
        const skeleton = this.fighter.skeleton;
        if (!skeleton) return;

        // jointKey is "parent_child", get the child bone
        const parts = jointKey.split('_');
        const childName = parts[parts.length - 1];
        const childBone = skeleton.bones[childName];

        if (childBone) {
            this._setRagdoll(childBone);
        }

        if (jointKey === 'hip_spine' || jointKey === 'spine_neck') {
            if (jointKey === 'hip_spine') {
                this.spineHPDrain = 2;
            }
        }

        this._updateMovementPenalties();
    }

    /**
     * Set a bone and all descendants to ragdoll mode.
     */
    _setRagdoll(bone) {
        bone.mode = 'ragdoll';
        bone.angularVelocity = (Math.random() - 0.5) * 2; // random initial spin
        for (const child of bone.children) {
            this._setRagdoll(child);
        }
    }

    /**
     * Update movement speed/jump penalties based on structural damage.
     */
    _updateMovementPenalties() {
        const structural = this.fighter.structural;
        if (!structural) return;

        const legState = structural.getLegDamageState();
        const armState = structural.getArmDamageState();

        // Leg penalties
        switch (legState) {
            case 'LEG_INJURED':
                this.fighter.speedMult = 0.7;
                this.fighter.jumpMult = 0.5;
                break;
            case 'LEG_DESTROYED':
                this.fighter.speedMult = 0.4;
                this.fighter.jumpMult = 0;
                break;
            case 'NO_LEGS':
                this.fighter.speedMult = 0.1;
                this.fighter.jumpMult = 0;
                break;
            default:
                this.fighter.speedMult = 1.0;
                this.fighter.jumpMult = 1.0;
        }

        // Spine break: -50% everything
        if (structural.isSpineBroken()) {
            this.fighter.speedMult *= 0.5;
            this.fighter.jumpMult *= 0.5;
        }
    }

    /**
     * Per-frame update: spine HP drain.
     */
    update(dt) {
        if (this.spineHPDrain > 0) {
            this.fighter.hp -= this.spineHPDrain * (dt / 1000);
            this.fighter.hp = Math.max(0, this.fighter.hp);
        }
    }
}
