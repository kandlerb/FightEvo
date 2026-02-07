import { CONFIG } from '../config.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { Arena } from '../arena/Arena.js';
import { Renderer } from '../rendering/Renderer.js';

export class Game {
    constructor(canvas) {
        this._physicsWorld = new PhysicsWorld();
        this._arena = new Arena(this._physicsWorld);
        this._renderer = new Renderer(canvas);

        // Temporary test body — stands in for the player until Prompt 2
        this._testBody = Matter.Bodies.rectangle(
            CONFIG.CANVAS_WIDTH / 2,
            CONFIG.CANVAS_HEIGHT / 2 - 100,
            30,
            70,
            {
                inertia: Infinity,
                inverseInertia: 0,
                friction: CONFIG.GROUND_FRICTION,
                frictionAir: CONFIG.AIR_FRICTION,
                label: 'testBody',
            }
        );
        this._physicsWorld.addBody(this._testBody);
    }

    update(dt) {
        this._physicsWorld.step(dt);
    }

    render(interpolation) {
        this._renderer.render(this._arena.getBodies(), this._testBody);
    }
}
