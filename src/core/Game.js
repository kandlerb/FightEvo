import { CONFIG } from '../config.js';
import { InputManager } from './InputManager.js';
import { Camera } from './Camera.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { CollisionHandler } from '../physics/CollisionHandler.js';
import { Arena } from '../arena/Arena.js';
import { Renderer } from '../rendering/Renderer.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Skeleton } from '../skeleton/Skeleton.js';
import { DamagePipeline } from '../combat/DamagePipeline.js';

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
        this._spawnDummy();

        // Init input
        this.input.init();
    }

    _spawnPlayer() {
        const spawnX = CONFIG.ARENA_WIDTH / 2 - 80;
        const spawnY = CONFIG.GROUND_Y - 80;

        this.player = new Player(spawnX, spawnY, this.input);
        this.player.skeleton = new Skeleton();
        this.player.initAnimation();

        this.physics.addBody(this.player.body);
        this.fighters.push(this.player);
    }

    _spawnDummy() {
        const spawnX = CONFIG.ARENA_WIDTH / 2 + 80;
        const spawnY = CONFIG.GROUND_Y - 80;

        this.dummy = new Enemy(spawnX, spawnY);
        this.dummy.skeleton = new Skeleton();
        this.dummy.initAnimation();

        this.physics.addBody(this.dummy.body);
        this.fighters.push(this.dummy);
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

        // Combat resolution: check each fighter's hitboxes against others
        this._resolveCombat();

        // Camera follows player
        this.camera.follow(this.player.x, this.player.y);
        this.camera.update(dt);

        // Post-frame input cleanup
        this.input.postUpdate();
    }

    _resolveCombat() {
        for (let i = 0; i < this.fighters.length; i++) {
            const attacker = this.fighters[i];
            if (!attacker.combat) continue;

            for (let j = 0; j < this.fighters.length; j++) {
                if (i === j) continue;
                const defender = this.fighters[j];
                if (!defender.combat) continue;

                const hits = attacker.combat.hitboxManager.checkCollisions(
                    defender.combat.hurtboxManager
                );

                for (const hit of hits) {
                    const zone = hit.hurtbox.zone;
                    const move = hit.hitbox.move;
                    const comboScale = attacker.combat.getDamageScale();

                    DamagePipeline.resolve(attacker, defender, move, zone, comboScale);
                    attacker.combat.confirmHit();

                    // Screen shake on hit
                    const shakeMag = Math.min(move.damage * 0.3, 8);
                    this.camera.shake(shakeMag, 150);
                }
            }
        }
    }

    render(interpolation) {
        this.renderer.draw(this.arena, this.fighters, interpolation);
    }

    destroy() {
        this.input.destroy();
    }
}
