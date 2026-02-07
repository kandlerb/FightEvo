import { CONFIG } from '../config.js';
import { InputManager } from './InputManager.js';
import { Camera } from './Camera.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { CollisionHandler } from '../physics/CollisionHandler.js';
import { Arena } from '../arena/Arena.js';
import { Renderer } from '../rendering/Renderer.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Skeleton } from '../skeleton/Skeleton.js';
import { DamagePipeline } from '../combat/DamagePipeline.js';
import { EvolutionManager } from '../ai/EvolutionManager.js';
import { WaveManager, WaveState } from '../waves/WaveManager.js';
import { MutationCatalog } from '../mutations/MutationCatalog.js';

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

        // Wave management
        this.waves = new WaveManager();

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
        const maxEnemies = this.waves.getMaxEnemies();
        if (this.enemies.length >= maxEnemies) return;

        // Spawn position: random side of arena
        const side = Math.random() > 0.5 ? 1 : -1;
        const spawnX = CONFIG.ARENA_WIDTH / 2 + side * (CONFIG.ARENA_WIDTH / 2 - 80);
        const spawnY = CONFIG.GROUND_Y - 80;

        const { genome, mutations } = this.evolution.requestSpawn(this.waves.wave);
        const enemy = new Enemy(spawnX, spawnY, genome, mutations);
        enemy.skeleton = new Skeleton();
        enemy.initAnimation();

        // Apply mutations (bone changes, stat overrides) AFTER skeleton + structural init
        enemy.applyMutations();

        // Apply wave stat scaling (on top of mutation stats)
        const statMult = this.waves.getStatMultiplier();
        enemy.hp *= statMult;
        enemy.maxHp = enemy.hp;

        this.physics.addBody(enemy.body);
        this.fighters.push(enemy);
        this.enemies.push(enemy);
    }

    _spawnBoss() {
        // Spawn at center-right of arena
        const spawnX = CONFIG.ARENA_WIDTH / 2 + 100;
        const spawnY = CONFIG.GROUND_Y - 80;

        // Dominant genome from evolution
        const genome = this.evolution.getDominantGenome();

        // Boss gets biased mutations (higher tier more likely)
        const mutCount = CONFIG.BOSS_MUTATION_COUNT;
        const mutations = MutationCatalog.rollBossMutations(mutCount, this.waves.wave);

        const boss = new Boss(spawnX, spawnY, genome, mutations, this.evolution.generation);
        boss.skeleton = new Skeleton();
        boss.initAnimation();

        // Apply mutations
        boss.applyMutations();

        // Apply boss HP multiplier on top of wave scaling + mutations
        const statMult = this.waves.getStatMultiplier();
        boss.hp *= statMult * CONFIG.BOSS_HP_MULT;
        boss.maxHp = boss.hp;

        this.physics.addBody(boss.body);
        this.fighters.push(boss);
        this.enemies.push(boss);

        return boss;
    }

    /**
     * Clear all regular enemies (called before boss intro).
     */
    _clearEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            this.physics.removeBody(enemy.body);
            const fi = this.fighters.indexOf(enemy);
            if (fi !== -1) this.fighters.splice(fi, 1);
            this.enemies.splice(i, 1);
        }
    }

    /**
     * Heal player and reset structural damage before boss fight.
     */
    _preparePlayerForBoss() {
        // Reset structural HP
        if (CONFIG.PLAYER_STRUCTURAL_HEAL_ON_BOSS && this.player.structural) {
            this.player.structural.reset();
            // Sync reset bones
            if (this.player.skeleton) {
                for (const bone of Object.values(this.player.skeleton.bones)) {
                    bone.structuralHP = 1.0;
                    bone.isBroken = false;
                    if (bone.mode === 'ragdoll') {
                        bone.mode = 'animated';
                        bone.angularVelocity = 0;
                    }
                }
            }
            // Reset movement penalties
            this.player.speedMult = 1.0;
            this.player.jumpMult = 1.0;
        }
    }

    /**
     * Reward player for defeating boss.
     */
    _onBossDefeated() {
        // Heal player
        this.player.hp = Math.min(
            this.player.maxHp,
            this.player.hp + CONFIG.BOSS_DEFEAT_HEAL
        );

        // Heavy camera shake for celebration
        this.camera.shake(15, 400);

        // Resume wave flow
        this.waves.bossDefeated();
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

        // Wave state machine
        const waveEvent = this.waves.update();

        if (waveEvent === 'intro_done') {
            // Boss intro finished → spawn boss
            const boss = this._spawnBoss();
            this.waves.beginBossFight(boss);
        }

        if (waveEvent === 'transition_done') {
            // Wave transition finished → resume normal spawning
            // Enemies will be spawned by the respawn timer below
        }

        // Skip physics/combat during non-active states
        if (this.waves.state === WaveState.BOSS_INTRO) {
            // During intro: still render, but no gameplay
            this.camera.follow(this.player.x, this.player.y);
            this.camera.update(dt);
            this.input.postUpdate();
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

        // Respawn timer (only during WAVE_ACTIVE)
        if (this.waves.shouldRespawn(this.enemies.length)) {
            this._spawnEnemy();
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
        const deathEffects = []; // deferred effects (explosions, splits)
        let bossKilled = false;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.hp <= 0) {
                // Check if this was the boss
                if (enemy.isBoss) {
                    bossKilled = true;
                }

                // Report fitness to evolution system
                const fitness = enemy.getFinalFitness();
                this.evolution.reportDeath(enemy.agent.genome, fitness);

                // Collect death effects before removal
                if (enemy._explodeOnDeath) {
                    deathEffects.push({
                        type: 'explode',
                        x: enemy.x,
                        y: enemy.y,
                        radius: enemy._explodeOnDeath.radius,
                        damage: enemy._explodeOnDeath.damage,
                    });
                }

                if (enemy._splitOnDeath) {
                    deathEffects.push({
                        type: 'split',
                        x: enemy.x,
                        y: enemy.y,
                        genome: enemy.agent.genome,
                        splitData: enemy._splitOnDeath,
                    });
                }

                // Remove from physics + lists
                this.physics.removeBody(enemy.body);
                const fi = this.fighters.indexOf(enemy);
                if (fi !== -1) this.fighters.splice(fi, 1);
                this.enemies.splice(i, 1);

                // Track kills and wave progression (skip boss — handled separately)
                if (!enemy.isBoss) {
                    const action = this.waves.registerKill();
                    if (action === 'advance') {
                        this._handleWaveAdvance();
                    }
                }
            }
        }

        // Process death effects
        for (const effect of deathEffects) {
            if (effect.type === 'explode') {
                this._handleExplosion(effect);
            } else if (effect.type === 'split') {
                this._handleSplit(effect);
            }
        }

        // Boss defeated
        if (bossKilled) {
            this._onBossDefeated();
        }
    }

    /**
     * Handle wave advancement. Clear enemies if boss incoming.
     */
    _handleWaveAdvance() {
        const result = this.waves.beginAdvance();

        if (result === 'boss_intro') {
            // Clear all regular enemies for boss entrance
            this._clearEnemies();
            // Prepare player for boss fight
            this._preparePlayerForBoss();
        }
        // For 'transition', enemies just stop spawning briefly
    }

    _handleExplosion(effect) {
        // Damage player if within radius
        const dx = this.player.x - effect.x;
        const dy = this.player.y - effect.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < effect.radius) {
            const falloff = 1 - dist / effect.radius;
            this.player.hp -= effect.damage * falloff;
            this.player.hp = Math.max(0, this.player.hp);
        }

        // Heavy screen shake
        this.camera.shake(12, 300);
    }

    _handleSplit(effect) {
        const { genome, splitData } = effect;

        for (let i = 0; i < splitData.count; i++) {
            const offsetX = (i === 0 ? -30 : 30);
            const childGenome = genome.clone();

            // Children have no body mutations
            const child = new Enemy(effect.x + offsetX, effect.y, childGenome, []);
            child.skeleton = new Skeleton();
            child.initAnimation();

            // Apply split stats
            child.hp = CONFIG.ENEMY_BASE_HP * this.waves.getStatMultiplier() * splitData.hpMult;
            child.maxHp = child.hp;
            child._baseDamageMult = splitData.damageMult;

            // Scale down visually
            if (child.skeleton) {
                for (const bone of Object.values(child.skeleton.bones)) {
                    if (bone.length > 0) {
                        bone.length *= splitData.scale;
                        bone.thickness *= splitData.scale;
                    }
                }
            }

            this.physics.addBody(child.body);
            this.fighters.push(child);
            this.enemies.push(child);
        }
    }

    render(interpolation) {
        const stats = this.waves.getStats(
            this.evolution.generation,
            this.enemies.length,
            this.state
        );
        this.renderer.draw(this.arena, this.fighters, interpolation, stats);
    }

    destroy() {
        this.input.destroy();
    }
}
