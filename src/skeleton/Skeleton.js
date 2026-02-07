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
            const boneColor = this._getDamageColor(bone, color);
            const isBroken = bone.isBroken;

            if (bone.isHead) {
                // Draw head as a circle at the endpoint
                ctx.fillStyle = boneColor;
                if (isBroken) {
                    ctx.setLineDash([3, 3]);
                    ctx.strokeStyle = boneColor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(bone.worldEnd.x, bone.worldEnd.y, 8, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                } else {
                    ctx.beginPath();
                    ctx.arc(bone.worldEnd.x, bone.worldEnd.y, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                if (isBroken) {
                    ctx.setLineDash([4, 4]);
                }
                ctx.strokeStyle = boneColor;
                ctx.lineWidth = bone.thickness;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(bone.worldStart.x, bone.worldStart.y);
                ctx.lineTo(bone.worldEnd.x, bone.worldEnd.y);
                ctx.stroke();
                if (isBroken) {
                    ctx.setLineDash([]);
                }
            }

            // Draw damage crack indicators for critically damaged bones
            if (!isBroken && bone.structuralHP < 0.4 && bone.structuralHP > 0) {
                const mx = (bone.worldStart.x + bone.worldEnd.x) / 2;
                const my = (bone.worldStart.y + bone.worldEnd.y) / 2;
                ctx.strokeStyle = '#f00';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(mx - 3, my - 3);
                ctx.lineTo(mx + 3, my + 3);
                ctx.stroke();
            }

            // Draw endpoints (hands/feet) as small circles
            if (bone.isEndpoint) {
                ctx.fillStyle = boneColor;
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

    /**
     * Get the display color for a bone based on structural damage.
     * Interpolates from base color toward dark red/grey as HP drops.
     */
    _getDamageColor(bone, baseColor) {
        const hp = bone.structuralHP;
        if (hp >= 0.8) return baseColor;

        // Parse the base color
        const rgb = this._parseColor(baseColor);
        if (!rgb) return baseColor;

        if (bone.isBroken) {
            // Broken: dark grey
            return '#555';
        }

        // Lerp toward dark red based on damage
        const t = 1 - (hp / 0.8); // 0 at 80% HP, 1 at 0% HP
        const r = Math.round(rgb.r + (100 - rgb.r) * t);
        const g = Math.round(rgb.g * (1 - t * 0.8));
        const b = Math.round(rgb.b * (1 - t * 0.8));

        return `rgb(${r},${g},${b})`;
    }

    _parseColor(color) {
        if (color.startsWith('#')) {
            let hex = color.slice(1);
            if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
            };
        }
        return null;
    }
}
