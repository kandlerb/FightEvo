import { Pose } from './Pose.js';

/**
 * An Animation is an ordered sequence of keyframes, each with a Pose and duration.
 * It interpolates between keyframes and supports looping and hold-on-last-frame.
 */
export class Animation {
    /**
     * @param {string} name
     * @param {Array<{pose: Pose, duration: number}>} keyframes - duration in frames
     * @param {object} opts
     * @param {boolean} opts.loop - whether to loop
     * @param {boolean} opts.hold - hold last frame when done (for crouch, block, etc.)
     */
    constructor(name, keyframes, opts = {}) {
        this.name = name;
        this.keyframes = keyframes;
        this.loop = opts.loop || false;
        this.hold = opts.hold || false;

        // Precompute total duration
        this.totalFrames = 0;
        for (const kf of keyframes) {
            this.totalFrames += kf.duration;
        }
    }

    /**
     * Sample the animation at a given frame, returning an interpolated Pose.
     * @param {number} frame - current frame (0-based)
     * @returns {{pose: Pose, finished: boolean}}
     */
    sample(frame) {
        if (this.keyframes.length === 0) {
            return { pose: new Pose(), finished: true };
        }

        if (this.keyframes.length === 1) {
            return { pose: this.keyframes[0].pose, finished: frame >= this.keyframes[0].duration };
        }

        let effectiveFrame = frame;

        if (this.loop) {
            effectiveFrame = frame % this.totalFrames;
        } else if (frame >= this.totalFrames) {
            if (this.hold) {
                return { pose: this.keyframes[this.keyframes.length - 1].pose, finished: true };
            }
            return { pose: this.keyframes[this.keyframes.length - 1].pose, finished: true };
        }

        // Find which two keyframes we're between
        let accumulated = 0;
        for (let i = 0; i < this.keyframes.length; i++) {
            const kf = this.keyframes[i];
            if (effectiveFrame < accumulated + kf.duration) {
                const localT = (effectiveFrame - accumulated) / kf.duration;
                const nextIdx = (i + 1) % this.keyframes.length;

                // If we're at the last keyframe and not looping, hold it
                if (i === this.keyframes.length - 1 && !this.loop) {
                    return { pose: kf.pose, finished: false };
                }

                const interpolated = Pose.lerp(kf.pose, this.keyframes[nextIdx].pose, localT);
                return { pose: interpolated, finished: false };
            }
            accumulated += kf.duration;
        }

        // Fallback
        return { pose: this.keyframes[0].pose, finished: true };
    }
}
