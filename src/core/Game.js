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
import { ParticleSystem } from '../particles/ParticleSystem.js';
import { AudioManager } from '../audio/AudioManager.js';

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

        // Effects
        this.particles = new ParticleSystem();
        this.audio = new AudioManager();

        // Damage number popups
        this.damageNumbers = [];

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

        // Track game-over trigger (for one-shot audio)
        this._gameOverTriggered = false;

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
        const maxEnemies = this.waves.getMaxEnemies();
        if (this.enemies.length >= maxEnemies) return;

        const side = Math.random() > 0.5 ? 1 : -1;
        const spawnX = CONFIG.ARENA_WIDTH / 2 + side * (CONFIG.ARENA_WIDTH / 2 - 80);
        const spawnY = CONFIG.GROUND_Y - 80;

        const { genome, mutations } = this.evolution.requestSpawn(this.waves.wave);
        const enemy = new Enemy(spawnX, spawnY, genome, mutations);
        enemy.skeleton = new Skeleton();
        enemy.initAnimation();
        enemy.applyMutations();

        const statMult = this.waves.getStatMultiplier();
        enemy.hp *= statMult;
        enemy.maxHp = enemy.hp;

        this.physics.addBody(enemy.body);
        this.fighters.push(enemy);
        this.enemies.push(enemy);
    }

    _spawnBoss() {
        const spawnX = CONFIG.ARENA_WIDTH / 2 + 100;
        const spawnY = CONFIG.GROUND_Y - 80;

        const genome = this.evolution.getDominantGenome();
        const mutCount = CONFIG.BOSS_MUTATION_COUNT;
        const mutations = MutationCatalog.rollBossMutations(mutCount, this.waves.wave);

        const boss = new Boss(spawnX, spawnY, genome, mutations, this.evolution.generation);
        boss.skeleton = new Skeleton();
        boss.initAnimation();
        boss.applyMutations();

        const statMult = this.waves.getStatMultiplier();
        boss.hp *= statMult * CONFIG.BOSS_HP_MULT;
        boss.maxHp = boss.hp;

        this.physics.addBody(boss.body);
        this.fighters.push(boss);
        this.enemies.push(boss);

        return boss;
    }

    _clearEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            this.physics.removeBody(enemy.body);
            const fi = this.fighters.indexOf(enemy);
            if (fi !== -1) this.fighters.splice(fi, 1);
            this.enemies.splice(i, 1);
        }
    }

    _preparePlayerForBoss() {
        if (CONFIG.PLAYER_STRUCTURAL_HEAL_ON_BOSS && this.player.structural) {
            this.player.structural.reset();
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
            this.player.speedMult = 1.0;
            this.player.jumpMult = 1.0;
        }
    }

    _onBossDefeated(bossX, bossY) {
        this.player.hp = Math.min(
            this.player.maxHp,
            this.player.hp + CONFIG.BOSS_DEFEAT_HEAL
        );
        this.camera.shake(15, 400);
        this.particles.bossDefeat(bossX, bossY);
        this.audio.bossDefeat();
        this.waves.bossDefeated();
    }

    update(dt) {
        // Pause/unpause handling
        if (this.state === State.PAUSED) {
            this.input.update();
            if (this.input.wasPressed('escape')) {
                this.state = State.PLAYING;
                if (!this.audio.initialized) this.audio.init();
            }
            this.input.postUpdate();
            return;
        }

        if (this.state === State.GAME_OVER) return;

        // Input
        this.input.update();

        // Init audio on first key interaction
        if (!this.audio.initialized) this.audio.init();

        // Pause toggle
        if (this.input.wasPressed('escape')) {
            this.state = State.PAUSED;
            this.input.postUpdate();
            return;
        }

        // Wave state machine
        const waveEvent = this.waves.update();

        if (waveEvent === 'intro_done') {
            const boss = this._spawnBoss();
            this.waves.beginBossFight(boss);
        }

        if (waveEvent === 'transition_done') {
            this.audio.waveAdvance();
        }

        // Update particles always (even during intro)
        this.particles.update(dt);
        this._updateDamageNumbers(dt);

        // Skip physics/combat during boss intro
        if (this.waves.state === WaveState.BOSS_INTRO) {
            if (this.waves._introTimer === CONFIG.BOSS_INTRO_FRAMES - 1) {
                this.audio.bossIntro();
            }
            this.camera.follow(this.player.x, this.player.y);
            this.camera.update(dt);
            this.input.postUpdate();
            return;
        }

        // Physics
        this.physics.step(dt);

        // Update player
        this.player.update(dt);

        // Update enemies
        for (const enemy of this.enemies) {
            enemy.update(dt, this.player, this.enemies);
        }

        // Combat resolution
        this._resolveCombat();

        // Handle enemy death
        this._handleDeaths();

        // Respawn timer
        if (this.waves.shouldRespawn(this.enemies.length)) {
            this._spawnEnemy();
        }

        // Camera follows player
        this.camera.follow(this.player.x, this.player.y);
        this.camera.update(dt);

        // Post-frame input cleanup
        this.input.postUpdate();

        // Check game over
        if (this.player.hp <= 0 && !this._gameOverTriggered) {
            this.state = State.GAME_OVER;
            this._gameOverTriggered = true;
            this.audio.gameOver();
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

                    const result = DamagePipeline.resolve(attacker, defender, move, zone, comboScale, boneName);
                    attacker.combat.confirmHit();

                    // Screen shake
                    const shakeMag = Math.min(move.damage * 0.3, 8);
                    this.camera.shake(shakeMag, 150);

                    // Impact position (approximate)
                    const impactX = defender.x + (Math.random() - 0.5) * 20;
                    const impactY = defender.y - 10 + (Math.random() - 0.5) * 30;

                    // Particles + audio
                    if (result.blocked) {
                        this.particles.blockFlash(impactX, impactY);
                        this.audio.blockImpact();
                    } else {
                        this.particles.hitSpark(impactX, impactY, attacker.facingDirection);
                        this.audio.hitImpact(result.hpDamage);

                        if (CONFIG.SHOW_DAMAGE_NUMBERS) {
                            this._spawnDamageNumber(impactX, impactY, result.hpDamage);
                        }
                    }

                    // Structural damage effects
                    if (result.boneBreak) {
                        this.particles.boneCrack(impactX, impactY);
                        this.audio.boneBreak();
                        this.camera.shake(10, 200);
                    }
                    if (result.jointDislocate) {
                        this.particles.jointPop(impactX, impactY);
                        this.audio.jointPop();
                    }
                }
            }
        }
    }

    _handleDeaths() {
        const deathEffects = [];
        let bossKilled = false;
        let bossPos = null;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.hp <= 0) {
                if (enemy.isBoss) {
                    bossKilled = true;
                    bossPos = { x: enemy.x, y: enemy.y };
                }

                const fitness = enemy.getFinalFitness();
                this.evolution.reportDeath(enemy.agent.genome, fitness);

                // Death particles + audio
                this.particles.deathBurst(enemy.x, enemy.y, enemy.color);
                this.audio.enemyDeath();

                if (enemy._explodeOnDeath) {
                    deathEffects.push({
                        type: 'explode',
                        x: enemy.x, y: enemy.y,
                        radius: enemy._explodeOnDeath.radius,
                        damage: enemy._explodeOnDeath.damage,
                    });
                }

                if (enemy._splitOnDeath) {
                    deathEffects.push({
                        type: 'split',
                        x: enemy.x, y: enemy.y,
                        genome: enemy.agent.genome,
                        splitData: enemy._splitOnDeath,
                    });
                }

                this.physics.removeBody(enemy.body);
                const fi = this.fighters.indexOf(enemy);
                if (fi !== -1) this.fighters.splice(fi, 1);
                this.enemies.splice(i, 1);

                if (!enemy.isBoss) {
                    const action = this.waves.registerKill();
                    if (action === 'advance') {
                        this._handleWaveAdvance();
                    }
                }
            }
        }

        for (const effect of deathEffects) {
            if (effect.type === 'explode') {
                this._handleExplosion(effect);
            } else if (effect.type === 'split') {
                this._handleSplit(effect);
            }
        }

        if (bossKilled && bossPos) {
            this._onBossDefeated(bossPos.x, bossPos.y);
        }
    }

    _handleWaveAdvance() {
        const result = this.waves.beginAdvance();
        if (result === 'boss_intro') {
            this._clearEnemies();
            this._preparePlayerForBoss();
        }
    }

    _handleExplosion(effect) {
        const dx = this.player.x - effect.x;
        const dy = this.player.y - effect.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < effect.radius) {
            const falloff = 1 - dist / effect.radius;
            this.player.hp -= effect.damage * falloff;
            this.player.hp = Math.max(0, this.player.hp);
        }

        this.particles.explosion(effect.x, effect.y, effect.radius);
        this.audio.explosion();
        this.camera.shake(12, 300);
    }

    _handleSplit(effect) {
        const { genome, splitData } = effect;

        for (let i = 0; i < splitData.count; i++) {
            const offsetX = (i === 0 ? -30 : 30);
            const childGenome = genome.clone();

            const child = new Enemy(effect.x + offsetX, effect.y, childGenome, []);
            child.skeleton = new Skeleton();
            child.initAnimation();

            child.hp = CONFIG.ENEMY_BASE_HP * this.waves.getStatMultiplier() * splitData.hpMult;
            child.maxHp = child.hp;
            child._baseDamageMult = splitData.damageMult;

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

    // ─── Damage numbers ─────────────────────────────────────

    _spawnDamageNumber(x, y, damage) {
        this.damageNumbers.push({
            x, y,
            text: Math.round(damage).toString(),
            life: 600,
            maxLife: 600,
            vy: -40,
        });
    }

    _updateDamageNumbers(dt) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.life -= dt;
            dn.y += dn.vy * (dt / 1000);
            if (dn.life <= 0) {
                this.damageNumbers.splice(i, 1);
            }
        }
    }

    render(interpolation) {
        const stats = this.waves.getStats(
            this.evolution.generation,
            this.enemies.length,
            this.state
        );

        stats.particles = this.particles;
        stats.damageNumbers = this.damageNumbers;
        stats.playerHPRatio = this.player ? this.player.hp / this.player.maxHp : 1;
        stats.isPaused = this.state === State.PAUSED;

        this.renderer.draw(this.arena, this.fighters, interpolation, stats);
    }

    destroy() {
        this.input.destroy();
    }
}
