import { AIInputSource } from './AIInputSource.js';
import { SensorArray } from './SensorArray.js';
import { FitnessEvaluator } from './FitnessEvaluator.js';

/**
 * Wraps a NEAT genome into a fighter controller.
 * Each frame: reads sensors → activates network → maps outputs to virtual inputs.
 * Also tracks fitness in real-time.
 */
export class NeatAgent {
    constructor(genome) {
        this.genome = genome;
        this.inputSource = new AIInputSource();
        this.fitness = new FitnessEvaluator();
    }

    /**
     * Per-frame update: sense → think → act.
     * @param {Fighter} self - the AI enemy
     * @param {Fighter} player - the player
     * @param {Fighter[]} allEnemies - all living enemies
     */
    update(self, player, allEnemies) {
        // Read sensors
        const inputs = SensorArray.read(self, player, allEnemies);

        // Activate neural network
        const outputs = this.genome.activate(inputs);

        // Map outputs to virtual input
        this.inputSource.setOutputs(outputs);

        // Track fitness
        this.fitness.update(self, player);
    }

    /**
     * Get final fitness score (called on death).
     */
    getFinalFitness() {
        return this.fitness.finalize();
    }

    /**
     * Reset for reuse (shouldn't normally be needed).
     */
    reset() {
        this.fitness = new FitnessEvaluator();
        this.inputSource = new AIInputSource();
    }
}
