import { CONFIG } from '../config.js';
import { InputManager } from './InputManager.js';
import { Camera } from './Camera.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { CollisionHandler } from '../physics/CollisionHandler.js';
import { Arena } from '../arena/Arena.js';
import { Renderer } from '../rendering/Renderer.js';
import { Player } from '../entities/Player.js';
import { Skeleton } from '../skeleton/Skeleton.js';

const State = {
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
};

export class Game {
    constructor(canvas) {
        this.state = State.PLAYING;

        // Core systems
        this.input = new InputManager();
        this.camera = new Camera();
        this.physics = new PhysicsWorld();
        this.collisions = new CollisionHandler(this.physics);
        this.renderer = new Renderer(canvas, this.camera);

        // Arena
        this.arena = new Arena(this.physics);

        // Fighters
        this.fighters = [];
        this._spawnPlayer();

        // Init input
        this.input.init();
    }

    _spawnPlayer() {
        const spawnX = CONFIG.ARENA_WIDTH / 2;
        const spawnY = CONFIG.GROUND_Y - 80;

        this.player = new Player(spawnX, spawnY, this.input);

        // Attach skeleton and init animation
        this.player.skeleton = new Skeleton();
        this.player.initAnimation();

        this.physics.addBody(this.player.body);
        this.fighters.push(this.player);
    }

    update(dt) {
        if (this.state === State.PAUSED) return;

        // Input
        this.input.update();

        // Physics
        this.physics.step(dt);

        // Fighters
        for (const fighter of this.fighters) {
            fighter.update(dt);
        }

        // Camera follows player
        this.camera.follow(this.player.x, this.player.y);
        this.camera.update(dt);

        // Post-frame input cleanup
        this.input.postUpdate();
    }

    render(interpolation) {
        this.renderer.draw(this.arena, this.fighters, interpolation);
    }

    destroy() {
        this.input.destroy();
    }
}
