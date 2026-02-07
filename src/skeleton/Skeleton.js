import { Bone } from './Bone.js';

export class Skeleton {
    constructor() {
        this.rootX = 0;
        this.rootY = 0;
        this.facing = 1;
        this.bones = {};
        this.root = null;

        this._buildDefaultSkeleton();
    }

    _buildDefaultSkeleton() {
        // Build the hierarchy from ARCHITECTURE.md
        // All rotations in radians, relative to parent
        // Default pose: standing upright

        const hip = new Bone('hip', 0, { thickness: 4 });
        this.root = hip;
        this.bones.hip = hip;

        // Spine goes up (negative Y)
        const spine = new Bone('spine', 22, { defaultRotation: -Math.PI / 2, thickness: 4 });
        hip.addChild(spine);
        this.bones.spine = spine;

        // Neck
        const neck = new Bone('neck', 6, { defaultRotation: 0, thickness: 2 });
        spine.addChild(neck);
        this.bones.neck = neck;

        // Head
        const head = new Bone('head', 10, { defaultRotation: 0, thickness: 2, isHead: true });
        neck.addChild(head);
        this.bones.head = head;

        // Left arm (facing right means left arm goes screen-left at slight angle)
        const shoulderL = new Bone('shoulderL', 3, { defaultRotation: Math.PI * 0.6, thickness: 2 });
        spine.addChild(shoulderL);
        this.bones.shoulderL = shoulderL;

        const upperArmL = new Bone('upperArmL', 16, { defaultRotation: Math.PI * 0.15, thickness: 3 });
        shoulderL.addChild(upperArmL);
        this.bones.upperArmL = upperArmL;

        const forearmL = new Bone('forearmL', 14, { defaultRotation: Math.PI * 0.1, thickness: 2 });
        upperArmL.addChild(forearmL);
        this.bones.forearmL = forearmL;

        const handL = new Bone('handL', 4, { defaultRotation: 0, thickness: 2, isEndpoint: true });
        forearmL.addChild(handL);
        this.bones.handL = handL;

        // Right arm
        const shoulderR = new Bone('shoulderR', 3, { defaultRotation: Math.PI * 0.4, thickness: 2 });
        spine.addChild(shoulderR);
        this.bones.shoulderR = shoulderR;

        const upperArmR = new Bone('upperArmR', 16, { defaultRotation: -Math.PI * 0.15, thickness: 3 });
        shoulderR.addChild(upperArmR);
        this.bones.upperArmR = upperArmR;

        const forearmR = new Bone('forearmR', 14, { defaultRotation: -Math.PI * 0.1, thickness: 2 });
        upperArmR.addChild(forearmR);
        this.bones.forearmR = forearmR;

        const handR = new Bone('handR', 4, { defaultRotation: 0, thickness: 2, isEndpoint: true });
        forearmR.addChild(handR);
        this.bones.handR = handR;

        // Left leg (goes down-left)
        const hipL = new Bone('hipL', 4, { defaultRotation: Math.PI * 0.6, thickness: 2 });
        hip.addChild(hipL);
        this.bones.hipL = hipL;

        const thighL = new Bone('thighL', 20, { defaultRotation: Math.PI * -0.1, thickness: 3 });
        hipL.addChild(thighL);
        this.bones.thighL = thighL;

        const shinL = new Bone('shinL', 18, { defaultRotation: Math.PI * 0.05, thickness: 3 });
        thighL.addChild(shinL);
        this.bones.shinL = shinL;

        const footL = new Bone('footL', 6, { defaultRotation: Math.PI * 0.3, thickness: 2, isEndpoint: true });
        shinL.addChild(footL);
        this.bones.footL = footL;

        // Right leg (goes down-right)
        const hipR = new Bone('hipR', 4, { defaultRotation: Math.PI * 0.4, thickness: 2 });
        hip.addChild(hipR);
        this.bones.hipR = hipR;

        const thighR = new Bone('thighR', 20, { defaultRotation: Math.PI * 0.1, thickness: 3 });
        hipR.addChild(thighR);
        this.bones.thighR = thighR;

        const shinR = new Bone('shinR', 18, { defaultRotation: -Math.PI * 0.05, thickness: 3 });
        thighR.addChild(shinR);
        this.bones.shinR = shinR;

        const footR = new Bone('footR', 6, { defaultRotation: -Math.PI * 0.3, thickness: 2, isEndpoint: true });
        shinR.addChild(footR);
        this.bones.footR = footR;
    }

    setPosition(x, y) {
        this.rootX = x;
        this.rootY = y;
    }

    setFacing(dir) {
        this.facing = dir;
    }

    update(dt) {
        // Compute world transforms in local space (facing=right)
        // Facing is handled via canvas scale in draw()
        this.root.computeWorldTransform(0, 0, 0);
    }

    draw(ctx, color) {
        this.update(0);

        ctx.save();
        // Translate to root position, then flip horizontally if facing left
        ctx.translate(this.rootX, this.rootY);
        if (this.facing === -1) {
            ctx.scale(-1, 1);
        }
        this._drawBone(ctx, this.root, color);
        ctx.restore();
    }

    _drawBone(ctx, bone, color) {
        // Don't draw the root hip (zero-length anchor point)
        if (bone.length > 0) {
            if (bone.isHead) {
                // Draw head as a circle at the endpoint
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(bone.worldEnd.x, bone.worldEnd.y, 8, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.strokeStyle = color;
                ctx.lineWidth = bone.thickness;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(bone.worldStart.x, bone.worldStart.y);
                ctx.lineTo(bone.worldEnd.x, bone.worldEnd.y);
                ctx.stroke();
            }

            // Draw endpoints (hands/feet) as small circles
            if (bone.isEndpoint) {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(bone.worldEnd.x, bone.worldEnd.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Recurse children
        for (const child of bone.children) {
            this._drawBone(ctx, child, color);
        }
    }
}
