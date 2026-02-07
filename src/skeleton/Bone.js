export class Bone {
    constructor(name, length, opts = {}) {
        this.name = name;
        this.parent = null;
        this.children = [];
        this.length = length;

        // Local transform (relative to parent)
        this.localRotation = opts.defaultRotation || 0;
        this.defaultRotation = opts.defaultRotation || 0;

        // Computed world-space values
        this.worldPosition = { x: 0, y: 0 };
        this.worldRotation = 0;
        this.worldStart = { x: 0, y: 0 };
        this.worldEnd = { x: 0, y: 0 };

        // Rendering
        this.thickness = opts.thickness || 3;
        this.isHead = opts.isHead || false;
        this.isEndpoint = opts.isEndpoint || false;

        // Mode: 'animated' or 'ragdoll'
        this.mode = 'animated';
        this.angularVelocity = 0;
    }

    addChild(bone) {
        bone.parent = this;
        this.children.push(bone);
        return bone;
    }

    computeWorldTransform(parentWorldX, parentWorldY, parentWorldRotation) {
        this.worldStart.x = parentWorldX;
        this.worldStart.y = parentWorldY;
        this.worldRotation = parentWorldRotation + this.localRotation;

        this.worldEnd.x = this.worldStart.x + Math.cos(this.worldRotation) * this.length;
        this.worldEnd.y = this.worldStart.y + Math.sin(this.worldRotation) * this.length;

        this.worldPosition.x = (this.worldStart.x + this.worldEnd.x) / 2;
        this.worldPosition.y = (this.worldStart.y + this.worldEnd.y) / 2;

        // Recurse to children (they start where this bone ends)
        for (const child of this.children) {
            child.computeWorldTransform(
                this.worldEnd.x,
                this.worldEnd.y,
                this.worldRotation
            );
        }
    }
}
