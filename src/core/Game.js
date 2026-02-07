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
import { EvolutionManager } from '../ai/EvolutionManager.js';

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

        // Evolution
        this.evolution = new EvolutionManager();

        // Wave tracking
        this.wave = 1;
        this.killsThisWave = 0;
        this.killsToAdvance = CONFIG.KILLS_TO_ADVANCE_BASE;
        this.totalKills = 0;
        this.respawnTimer = 0;

        // Fighters
        this.fighters = [];
        this.enemies = [];
        this._spawnPlayer();

        // Spawn initial enemies
        this._spawnEnemy();
        this._spawnEnemy();

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

    _spawnEnemy() {
        // Don't exceed max enemies for current wave
        const maxEnemies = this._getMaxEnemies();
        if (this.enemies.length >= maxEnemies) return;

        // Spawn position: random side of arena
        const side = Math.random() > 0.5 ? 1 : -1;
        const spawnX = CONFIG.ARENA_WIDTH / 2 + side * (CONFIG.ARENA_WIDTH / 2 - 80);
        const spawnY = CONFIG.GROUND_Y - 80;

        const genome = this.evolution.requestSpawn();
        const enemy = new Enemy(spawnX, spawnY, genome);
        enemy.skeleton = new Skeleton();
        enemy.initAnimation();

        // Apply wave stat scaling
        const statMult = this._getStatMultiplier();
        enemy.hp *= statMult;
        enemy.maxHp = enemy.hp;

        this.physics.addBody(enemy.body);
        this.fighters.push(enemy);
        this.enemies.push(enemy);
    }

    _getMaxEnemies() {
        if (this.wave <= 2) return 2;
        if (this.wave <= 5) return 3;
        if (this.wave <= 9) return 4;
        if (this.wave <= 14) return 5;
        return 5 + Math.floor((this.wave - 14) / 3);
    }

    _getStatMultiplier() {
        return 1 + (this.wave - 1) * CONFIG.HP_SCALE_PER_WAVE;
    }

    _getRespawnDelay() {
        if (this.wave <= 2) return 180; // 3s
        if (this.wave <= 5) return 120; // 2s
        if (this.wave <= 9) return 90;  // 1.5s
        if (this.wave <= 14) return 60; // 1s
        return 30; // 0.5s
    }

    update(dt) {
        if (this.state !== State.PLAYING) return;

        // Input
        this.input.update();

        // Pause toggle
        if (this.input.wasPressed('escape')) {
            this.state = State.PAUSED;
            return;
        }

        // Physics
        this.physics.step(dt);

        // Update player
        this.player.update(dt);

        // Update enemies (they need player + allies references for sensors)
        for (const enemy of this.enemies) {
            enemy.update(dt, this.player, this.enemies);
        }

        // Combat resolution
        this._resolveCombat();

        // Handle enemy death
        this._handleDeaths();

        // Respawn timer
        if (this.enemies.length < this._getMaxEnemies()) {
            this.respawnTimer++;
            if (this.respawnTimer >= this._getRespawnDelay()) {
                this.respawnTimer = 0;
                this._spawnEnemy();
            }
        }

        // Camera follows player
        this.camera.follow(this.player.x, this.player.y);
        this.camera.update(dt);

        // Post-frame input cleanup
        this.input.postUpdate();

        // Check game over
        if (this.player.hp <= 0) {
            this.state = State.GAME_OVER;
        }
    }

    _resolveCombat() {
        for (let i = 0; i < this.fighters.length; i++) {
            const attacker = this.fighters[i];
            if (!attacker.combat) continue;

            for (let j = 0; j < this.fighters.length; j++) {
                if (i === j) continue;
                const defender = this.fighters[j];
                if (!defender.combat) continue;
                if (defender.hp <= 0) continue;

                const hits = attacker.combat.hitboxManager.checkCollisions(
                    defender.combat.hurtboxManager
                );

                for (const hit of hits) {
                    const zone = hit.hurtbox.zone;
                    const move = hit.hitbox.move;
                    const boneName = hit.hurtbox.bone;
                    const comboScale = attacker.combat.getDamageScale();

                    DamagePipeline.resolve(attacker, defender, move, zone, comboScale, boneName);
                    attacker.combat.confirmHit();

                    // Screen shake on hit
                    const shakeMag = Math.min(move.damage * 0.3, 8);
                    this.camera.shake(shakeMag, 150);
                }
            }
        }
    }

    _handleDeaths() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.hp <= 0) {
                // Report fitness to evolution system
                const fitness = enemy.getFinalFitness();
                this.evolution.reportDeath(enemy.agent.genome, fitness);

                // Remove from physics + lists
                this.physics.removeBody(enemy.body);
                const fi = this.fighters.indexOf(enemy);
                if (fi !== -1) this.fighters.splice(fi, 1);
                this.enemies.splice(i, 1);

                // Track kills and wave progression
                this.totalKills++;
                this.killsThisWave++;

                if (this.killsThisWave >= this.killsToAdvance) {
                    this._advanceWave();
                }
            }
        }
    }

    _advanceWave() {
        this.wave++;
        this.killsThisWave = 0;
        this.killsToAdvance = CONFIG.KILLS_TO_ADVANCE_BASE + (this.wave - 1) * CONFIG.KILLS_SCALE_PER_WAVE;
        this.respawnTimer = 0;
    }

    render(interpolation) {
        this.renderer.draw(this.arena, this.fighters, interpolation, {
            wave: this.wave,
            generation: this.evolution.generation,
            totalKills: this.totalKills,
            killsThisWave: this.killsThisWave,
            killsToAdvance: this.killsToAdvance,
            enemyCount: this.enemies.length,
            gameState: this.state,
        });
    }

    destroy() {
        this.input.destroy();
    }
}
