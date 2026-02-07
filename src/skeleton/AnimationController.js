import { AnimationLibrary } from './AnimationLibrary.js';
import { Pose } from './Pose.js';

/**
 * Manages animation playback for a skeleton: current animation, frame advancement,
 * crossfade blending between animations.
 */
export class AnimationController {
    constructor(skeleton) {
        this.skeleton = skeleton;

        this.currentAnim = AnimationLibrary.get('idle');
        this.currentFrame = 0;

        // Crossfade blending
        this.blendFrom = null;
        this.blendFromFrame = 0;
        this.blendFrames = 0;
        this.blendTotal = 0;
    }

    /**
     * Switch to a new animation. If crossfade > 0, blend from the current pose.
     */
    play(name, crossfadeFrames = 4) {
        const anim = AnimationLibrary.get(name);
        if (!anim) return;

        if (this.currentAnim && this.currentAnim.name === name) return;

        if (crossfadeFrames > 0 && this.currentAnim) {
            this.blendFrom = this.currentAnim;
            this.blendFromFrame = this.currentFrame;
            this.blendFrames = crossfadeFrames;
            this.blendTotal = crossfadeFrames;
        } else {
            this.blendFrom = null;
        }

        this.currentAnim = anim;
        this.currentFrame = 0;
    }

    /**
     * Advance one frame and apply the resulting pose to the skeleton.
     */
    update() {
        if (!this.currentAnim) return;

        const { pose: currentPose } = this.currentAnim.sample(this.currentFrame);
        this.currentFrame++;

        let finalPose = currentPose;

        // Handle crossfade blend
        if (this.blendFrom && this.blendFrames > 0) {
            const { pose: fromPose } = this.blendFrom.sample(this.blendFromFrame);
            const t = 1 - (this.blendFrames / this.blendTotal);
            finalPose = Pose.lerp(fromPose, currentPose, t);
            this.blendFrames--;
            if (this.blendFrames <= 0) {
                this.blendFrom = null;
            }
        }

        this._applyPose(finalPose);
    }

    /**
     * Apply a pose to the skeleton by setting each bone's localRotation
     * to its defaultRotation + the pose offset.
     */
    _applyPose(pose) {
        for (const [boneName, bone] of Object.entries(this.skeleton.bones)) {
            if (bone.mode !== 'animated') continue;
            const offset = pose.rotations[boneName] || 0;
            bone.localRotation = bone.defaultRotation + offset;
        }
    }
}
