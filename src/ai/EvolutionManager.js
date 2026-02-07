import { CONFIG } from '../config.js';
import { Population, Genome } from './Neat.js';

/**
 * Death-driven continuous evolution.
 *
 * Flow: Enemy spawns → fights → dies → scored → genome enters dead pool
 *       Dead pool hits threshold → evolve → new genomes fill spawn pool
 *
 * Living enemies are never modified. Only the spawn pool improves over time.
 */
export class EvolutionManager {
    constructor() {
        this.population = new Population(
            CONFIG.NEAT_POPULATION_SIZE,
            28, // 20 env + 8 structural sensors
            8,  // 8 virtual actions
            {
                mutationRate: CONFIG.NEAT_MUTATION_RATE,
                crossoverRate: CONFIG.NEAT_CROSSOVER_RATE,
                elitism: CONFIG.NEAT_ELITISM,
            }
        );

        this.deadPool = [];        // Scored genomes from killed enemies
        this.spawnPool = [];       // Ready-to-deploy genomes
        this.generation = 0;
        this.totalDeaths = 0;
        this.bestFitness = 0;
        this.allTimeScores = new Map(); // genome → cumulative fitness

        // Initialize spawn pool from population
        this._fillSpawnPool();
    }

    /**
     * Report an enemy death. Triggers evolution when dead pool is full.
     * @param {Genome} genome - the genome that died
     * @param {number} fitnessScore - final fitness from FitnessEvaluator
     */
    reportDeath(genome, fitnessScore) {
        genome.fitness = fitnessScore;
        this.deadPool.push(genome);
        this.totalDeaths++;

        if (fitnessScore > this.bestFitness) {
            this.bestFitness = fitnessScore;
        }

        // Track cumulative fitness for dominant genome selection
        const key = this._genomeKey(genome);
        const prev = this.allTimeScores.get(key) || 0;
        this.allTimeScores.set(key, prev + fitnessScore);

        if (this.deadPool.length >= CONFIG.DEAD_POOL_THRESHOLD) {
            this._evolve();
        }
    }

    /**
     * Get a genome for the next spawn.
     * Falls back to a random genome if spawn pool is empty.
     */
    requestSpawn() {
        if (this.spawnPool.length > 0) {
            return this.spawnPool.pop();
        }
        // Fallback: clone a random genome from population and mutate
        const genomes = this.population.genomes;
        const g = genomes[Math.floor(Math.random() * genomes.length)].clone();
        g.mutate({ mutationRate: CONFIG.NEAT_MUTATION_RATE });
        return g;
    }

    /**
     * Get the dominant genome (highest cumulative fitness).
     * Used for boss selection.
     */
    getDominantGenome() {
        if (this.population.genomes.length === 0) return null;

        let best = this.population.genomes[0];
        let bestScore = best.fitness;

        for (const g of this.population.genomes) {
            if (g.fitness > bestScore) {
                bestScore = g.fitness;
                best = g;
            }
        }

        return best.clone();
    }

    /**
     * Run NEAT evolution on the dead pool.
     */
    _evolve() {
        // Merge dead pool scores into the population's genomes
        // The dead pool genomes replace the worst in the population
        const combined = [...this.population.genomes];

        // Update population genomes with dead pool fitness
        for (const dead of this.deadPool) {
            // Find matching genome in population or add it
            let found = false;
            for (let i = 0; i < combined.length; i++) {
                if (combined[i].fitness === 0 || dead.fitness > combined[i].fitness) {
                    // Replace worst unfitted genome
                    if (combined[i].fitness === 0) {
                        combined[i] = dead;
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                // Sort and replace the worst
                combined.sort((a, b) => a.fitness - b.fitness);
                if (dead.fitness > combined[0].fitness) {
                    combined[0] = dead;
                }
            }
        }

        // Run NEAT evolution
        const newGenomes = this.population.evolve(combined);
        this.generation++;
        this.deadPool = [];

        // Fill spawn pool with new genomes
        this.spawnPool = newGenomes.map(g => g.clone());
        // Shuffle spawn pool so spawns are varied
        this._shuffle(this.spawnPool);
    }

    /**
     * Fill spawn pool from initial population.
     */
    _fillSpawnPool() {
        this.spawnPool = this.population.genomes.map(g => g.clone());
        this._shuffle(this.spawnPool);
    }

    /**
     * Simple string key for genome tracking (based on connections).
     */
    _genomeKey(genome) {
        return genome.connections.map(c =>
            `${c.from}-${c.to}:${c.weight.toFixed(3)}`
        ).join('|');
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
}
