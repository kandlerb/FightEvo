/**
 * A Pose is a snapshot of bone rotation offsets.
 * Values are offsets from each bone's defaultRotation.
 * Only bones that differ from default need to be specified.
 */
export class Pose {
    constructor(rotations = {}) {
        this.rotations = rotations;
    }

    /**
     * Linearly interpolate between two poses.
     * Uses shortest-path angular interpolation.
     */
    static lerp(poseA, poseB, t) {
        const result = {};
        const allKeys = new Set([
            ...Object.keys(poseA.rotations),
            ...Object.keys(poseB.rotations),
        ]);

        for (const key of allKeys) {
            const a = poseA.rotations[key] || 0;
            const b = poseB.rotations[key] || 0;
            result[key] = lerpAngle(a, b, t);
        }

        return new Pose(result);
    }
}

function lerpAngle(a, b, t) {
    let diff = b - a;
    // Shortest path
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
}
