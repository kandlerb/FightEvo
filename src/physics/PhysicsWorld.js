import Matter from 'matter-js';
import { CONFIG } from '../config.js';

export class PhysicsWorld {
    constructor() {
        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: CONFIG.GRAVITY },
        });
        this.world = this.engine.world;
    }

    step(dt) {
        Matter.Engine.update(this.engine, dt);
    }

    addBody(body) {
        Matter.Composite.add(this.world, body);
    }

    removeBody(body) {
        Matter.Composite.remove(this.world, body);
    }

    onCollisionStart(callback) {
        Matter.Events.on(this.engine, 'collisionStart', callback);
    }

    onCollisionEnd(callback) {
        Matter.Events.on(this.engine, 'collisionEnd', callback);
    }
}
