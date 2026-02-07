/**
 * Manages persistent bone-anchored hurtboxes. These exist as long as
 * the fighter is alive. Each hurtbox tracks a bone and reports its zone.
 */

const BASE_HURTBOXES = [
    { bone: 'spine',     width: 0.8, height: 1.0, zone: 'torso' },
    { bone: 'head',      width: 1.2, height: 1.2, zone: 'head' },
    { bone: 'neck',      width: 0.6, height: 0.8, zone: 'neck' },
    { bone: 'thighL',    width: 0.6, height: 0.8, zone: 'legs' },
    { bone: 'thighR',    width: 0.6, height: 0.8, zone: 'legs' },
    { bone: 'shinL',     width: 0.5, height: 0.7, zone: 'legs' },
    { bone: 'shinR',     width: 0.5, height: 0.7, zone: 'legs' },
    { bone: 'upperArmL', width: 0.5, height: 0.6, zone: 'arms' },
    { bone: 'upperArmR', width: 0.5, height: 0.6, zone: 'arms' },
    { bone: 'forearmL',  width: 0.4, height: 0.5, zone: 'arms' },
    { bone: 'forearmR',  width: 0.4, height: 0.5, zone: 'arms' },
];

export class HurtboxManager {
    constructor(fighter) {
        this.fighter = fighter;
        this.definitions = [...BASE_HURTBOXES];
        this.activeHurtboxes = [];
    }

    /**
     * Recompute hurtbox positions from current bone world transforms.
     */
    update() {
        this.activeHurtboxes = [];

        if (!this.fighter.skeleton) return;

        for (const def of this.definitions) {
            const bone = this.fighter.skeleton.bones[def.bone];
            if (!bone) continue;

            const rect = this._computeHurtboxRect(bone, def);
            this.activeHurtboxes.push({
                rect,
                bone: def.bone,
                zone: def.zone,
            });
        }
    }

    _computeHurtboxRect(bone, def) {
        const facing = this.fighter.facingDirection;
        const skeleton = this.fighter.skeleton;

        const dx = bone.worldEnd.x - bone.worldStart.x;
        const dy = bone.worldEnd.y - bone.worldStart.y;
        const boneLen = Math.sqrt(dx * dx + dy * dy) || 1;

        // Center at midpoint of bone
        const cx = (bone.worldStart.x + bone.worldEnd.x) / 2;
        const cy = (bone.worldStart.y + bone.worldEnd.y) / 2;

        const worldCx = skeleton.rootX + cx * facing;
        const worldCy = skeleton.rootY + cy;

        const w = def.width * boneLen;
        const h = def.height * boneLen;

        return {
            x: worldCx - w / 2,
            y: worldCy - h / 2,
            w,
            h,
        };
    }
}
