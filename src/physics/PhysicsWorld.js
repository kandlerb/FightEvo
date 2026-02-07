import { CONFIG } from '../config.js';

export class PhysicsWorld {
    constructor() {
        this._engine = Matter.Engine.create({
            gravity: { x: 0, y: CONFIG.GRAVITY },
        });
        this._world = this._engine.world;
    }

    step(dt) {
        Matter.Engine.update(this._engine, dt);
    }

    addBody(body) {
        Matter.Composite.add(this._world, body);
    }

    removeBody(body) {
        Matter.Composite.remove(this._world, body);
    }

    getEngine() {
        return this._engine;
    }

    getWorld() {
        return this._world;
    }
}
