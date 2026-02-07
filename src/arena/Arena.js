import { CONFIG } from '../config.js';

const GROUND_HEIGHT = 40;
const WALL_WIDTH = 20;
const PLATFORM_WIDTH = 200;
const PLATFORM_HEIGHT = 12;

export class Arena {
    constructor(physicsWorld) {
        this._physicsWorld = physicsWorld;
        this._bodies = {};

        this._createGround();
        this._createWalls();
        this._createPlatform();
        this._setupOneWayPlatform();
    }

    _createGround() {
        const ground = Matter.Bodies.rectangle(
            CONFIG.CANVAS_WIDTH / 2,
            CONFIG.CANVAS_HEIGHT - GROUND_HEIGHT / 2,
            CONFIG.CANVAS_WIDTH,
            GROUND_HEIGHT,
            { isStatic: true, friction: CONFIG.GROUND_FRICTION, label: 'ground' }
        );
        this._bodies.ground = ground;
        this._physicsWorld.addBody(ground);
    }

    _createWalls() {
        const wallLeft = Matter.Bodies.rectangle(
            WALL_WIDTH / 2,
            CONFIG.CANVAS_HEIGHT / 2,
            WALL_WIDTH,
            CONFIG.CANVAS_HEIGHT,
            { isStatic: true, label: 'wallLeft' }
        );

        const wallRight = Matter.Bodies.rectangle(
            CONFIG.CANVAS_WIDTH - WALL_WIDTH / 2,
            CONFIG.CANVAS_HEIGHT / 2,
            WALL_WIDTH,
            CONFIG.CANVAS_HEIGHT,
            { isStatic: true, label: 'wallRight' }
        );

        this._bodies.wallLeft = wallLeft;
        this._bodies.wallRight = wallRight;
        this._physicsWorld.addBody(wallLeft);
        this._physicsWorld.addBody(wallRight);
    }

    _createPlatform() {
        const platformY = CONFIG.CANVAS_HEIGHT - CONFIG.CANVAS_HEIGHT * 0.6;

        const platform = Matter.Bodies.rectangle(
            CONFIG.CANVAS_WIDTH / 2,
            platformY,
            PLATFORM_WIDTH,
            PLATFORM_HEIGHT,
            { isStatic: true, friction: CONFIG.GROUND_FRICTION, label: 'platform' }
        );
        this._bodies.platform = platform;
        this._physicsWorld.addBody(platform);
    }

    _setupOneWayPlatform() {
        const platform = this._bodies.platform;

        Matter.Events.on(this._physicsWorld.getEngine(), 'beforeUpdate', () => {
            // Reset platform collision — enable it each tick,
            // then selectively disable in collisionStart
        });

        Matter.Events.on(this._physicsWorld.getEngine(), 'collisionActive', (event) => {
            this._handlePlatformCollision(event);
        });

        Matter.Events.on(this._physicsWorld.getEngine(), 'collisionStart', (event) => {
            this._handlePlatformCollision(event);
        });
    }

    _handlePlatformCollision(event) {
        const platform = this._bodies.platform;

        for (const pair of event.pairs) {
            let other = null;
            if (pair.bodyA === platform) {
                other = pair.bodyB;
            } else if (pair.bodyB === platform) {
                other = pair.bodyA;
            }
            if (!other) continue;

            // If the other body's bottom edge is below the platform's top edge,
            // the body is coming from below or overlapping — disable collision
            const otherBottom = other.position.y + (other.bounds.max.y - other.bounds.min.y) / 2;
            const platformTop = platform.position.y - (platform.bounds.max.y - platform.bounds.min.y) / 2;

            if (otherBottom > platformTop + 5) {
                pair.isActive = false;
            }
        }
    }

    getBodies() {
        return this._bodies;
    }
}
