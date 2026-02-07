/**
 * Manages bone-anchored attack hitboxes. Each frame, active hitboxes
 * are computed from the current move's hitbox definitions and the
 * skeleton's bone world transforms.
 *
 * Uses AABB overlap detection against hurtboxes rather than Matter.js
 * sensors for simplicity. The hitbox rect moves with the bone each frame.
 */
export class HitboxManager {
    constructor(fighter) {
        this.fighter = fighter;
        this.activeHitboxes = [];
        this.hitList = new Set(); // fighters already hit by current attack
    }

    /**
     * Update hitboxes for the current frame of the current move.
     * @param {object|null} move - current move definition
     * @param {number} frame - current frame within the move
     */
    update(move, frame) {
        this.activeHitboxes = [];

        if (!move || !this.fighter.skeleton) return;

        const startFrame = move.startup;
        const endFrame = move.startup + move.active;

        if (frame < startFrame || frame >= endFrame) return;

        for (const hbDef of move.hitboxes) {
            const bone = this.fighter.skeleton.bones[hbDef.bone];
            if (!bone) continue;

            const rect = this._computeHitboxRect(bone, hbDef);
            this.activeHitboxes.push({
                rect,
                bone: hbDef.bone,
                move,
            });
        }
    }

    /**
     * Check this fighter's active hitboxes against another fighter's hurtboxes.
     * @param {HurtboxManager} targetHurtboxes
     * @returns {Array<{hitbox: object, hurtbox: object}>} list of hits
     */
    checkCollisions(targetHurtboxes) {
        const hits = [];
        const targetFighter = targetHurtboxes.fighter;

        if (this.hitList.has(targetFighter)) return hits;

        for (const hitbox of this.activeHitboxes) {
            for (const hurtbox of targetHurtboxes.activeHurtboxes) {
                if (this._aabbOverlap(hitbox.rect, hurtbox.rect)) {
                    this.hitList.add(targetFighter);
                    hits.push({ hitbox, hurtbox });
                    return hits; // one hit per target per attack
                }
            }
        }

        return hits;
    }

    /**
     * Clear the hit list (called when a new attack starts).
     */
    resetHitList() {
        this.hitList.clear();
    }

    _computeHitboxRect(bone, hbDef) {
        const facing = this.fighter.facingDirection;
        const skeleton = this.fighter.skeleton;

        // Bone direction vector
        const dx = bone.worldEnd.x - bone.worldStart.x;
        const dy = bone.worldEnd.y - bone.worldStart.y;
        const boneLen = Math.sqrt(dx * dx + dy * dy) || 1;

        // Position along bone
        const along = hbDef.localOffset.x;
        const perp = (hbDef.localOffset.y || 0) * facing;

        // Perpendicular unit vector
        const nx = -dy / boneLen;
        const ny = dx / boneLen;

        // Center of hitbox in skeleton-local space
        const cx = bone.worldStart.x + dx * along + nx * perp * boneLen;
        const cy = bone.worldStart.y + dy * along + ny * perp * boneLen;

        // Convert to world space
        const worldCx = skeleton.rootX + cx * facing;
        const worldCy = skeleton.rootY + cy;

        const w = hbDef.width * boneLen;
        const h = hbDef.height * boneLen;

        return {
            x: worldCx - w / 2,
            y: worldCy - h / 2,
            w,
            h,
        };
    }

    _aabbOverlap(a, b) {
        return a.x < b.x + b.w &&
               a.x + a.w > b.x &&
               a.y < b.y + b.h &&
               a.y + a.h > b.y;
    }
}
