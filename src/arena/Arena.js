import Matter from 'matter-js';
import { CONFIG } from '../config.js';
import { CATEGORY } from '../physics/PhysicsConfig.js';

export class Arena {
    constructor(physicsWorld) {
        this.physicsWorld = physicsWorld;
        this.bodies = [];
        this._createGeometry();
    }

    _createGeometry() {
        const wallMask = CATEGORY.PLAYER | CATEGORY.ENEMY;
        const groundMask = CATEGORY.PLAYER | CATEGORY.ENEMY;
        const platformMask = CATEGORY.PLAYER | CATEGORY.ENEMY;

        const staticOpts = {
            isStatic: true,
            friction: CONFIG.GROUND_FRICTION,
            restitution: 0,
        };

        // Ground
        const ground = Matter.Bodies.rectangle(
            CONFIG.ARENA_WIDTH / 2,
            CONFIG.GROUND_Y + (CONFIG.ARENA_HEIGHT - CONFIG.GROUND_Y) / 2,
            CONFIG.ARENA_WIDTH,
            CONFIG.ARENA_HEIGHT - CONFIG.GROUND_Y,
            {
                ...staticOpts,
                label: 'ground',
                collisionFilter: {
                    category: CATEGORY.GROUND,
                    mask: groundMask,
                },
            }
        );

        // Left wall
        const leftWall = Matter.Bodies.rectangle(
            CONFIG.WALL_THICKNESS / 2,
            CONFIG.ARENA_HEIGHT / 2,
            CONFIG.WALL_THICKNESS,
            CONFIG.ARENA_HEIGHT,
            {
                ...staticOpts,
                label: 'wall',
                collisionFilter: {
                    category: CATEGORY.WALL,
                    mask: wallMask,
                },
            }
        );

        // Right wall
        const rightWall = Matter.Bodies.rectangle(
            CONFIG.ARENA_WIDTH - CONFIG.WALL_THICKNESS / 2,
            CONFIG.ARENA_HEIGHT / 2,
            CONFIG.WALL_THICKNESS,
            CONFIG.ARENA_HEIGHT,
            {
                ...staticOpts,
                label: 'wall',
                collisionFilter: {
                    category: CATEGORY.WALL,
                    mask: wallMask,
                },
            }
        );

        // Platform (one-way: enemies/player can pass through from below)
        const platX = CONFIG.ARENA_WIDTH / 2;
        const platform = Matter.Bodies.rectangle(
            platX,
            CONFIG.PLATFORM_Y + CONFIG.PLATFORM_HEIGHT / 2,
            CONFIG.PLATFORM_WIDTH,
            CONFIG.PLATFORM_HEIGHT,
            {
                ...staticOpts,
                label: 'platform',
                collisionFilter: {
                    category: CATEGORY.PLATFORM,
                    mask: platformMask,
                },
            }
        );

        this.bodies = [ground, leftWall, rightWall, platform];
        this.ground = ground;
        this.leftWall = leftWall;
        this.rightWall = rightWall;
        this.platform = platform;

        for (const body of this.bodies) {
            this.physicsWorld.addBody(body);
        }
    }
}
