import { MUTATIONS, getMutationsForWave } from './MutationData.js';

/**
 * Rolls mutations for newly spawned enemies based on wave number.
 * Handles stacking limits, incompatibilities, and roll chances.
 */
export class MutationCatalog {
    /**
     * Roll mutations for a new enemy.
     * @param {number} waveNumber
     * @returns {object[]} Array of mutation definitions
     */
    static rollMutations(waveNumber) {
        // No mutations before wave 3
        if (waveNumber < 3) return [];

        const available = getMutationsForWave(waveNumber);
        if (available.length === 0) return [];

        const maxMutations = MutationCatalog._getMaxMutations(waveNumber);
        const result = [];

        for (let slot = 0; slot < maxMutations; slot++) {
            // Roll chance: halves for each additional mutation
            const rollChance = (0.3 + waveNumber * 0.04) / Math.pow(2, slot);
            if (Math.random() > rollChance) continue;

            // Filter compatible mutations
            const compatible = available.filter(mut =>
                MutationCatalog._isCompatible(mut, result)
            );

            if (compatible.length === 0) break;

            // Weighted random selection (higher tier = less likely)
            const selected = MutationCatalog._weightedSelect(compatible);
            result.push(selected);
        }

        return result;
    }

    /**
     * Max mutations per enemy based on wave.
     */
    static _getMaxMutations(waveNumber) {
        if (waveNumber < 6) return 1;
        if (waveNumber < 10) return 2;
        return 3;
    }

    /**
     * Check if a mutation is compatible with already-selected mutations.
     */
    static _isCompatible(mutation, selected) {
        for (const existing of selected) {
            // Can't stack the same mutation
            if (existing.name === mutation.name) return false;

            // Check incompatible lists (bidirectional)
            if (existing.incompatible.includes(mutation.name)) return false;
            if (mutation.incompatible.includes(existing.name)) return false;
        }
        return true;
    }

    /**
     * Weighted random selection. Tier 1 is more common than Tier 3.
     */
    static _weightedSelect(mutations) {
        const weights = mutations.map(m => {
            switch (m.tier) {
                case 1: return 3;
                case 2: return 2;
                case 3: return 1;
                default: return 1;
            }
        });

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;

        for (let i = 0; i < mutations.length; i++) {
            r -= weights[i];
            if (r <= 0) return mutations[i];
        }

        return mutations[mutations.length - 1];
    }

    /**
     * Get mutation names for boss (biased toward top-performing).
     * @param {number} count - how many mutations to assign
     * @param {number} waveNumber
     * @returns {object[]}
     */
    static rollBossMutations(count, waveNumber) {
        const available = getMutationsForWave(waveNumber);
        if (available.length === 0) return [];

        const result = [];
        for (let i = 0; i < count; i++) {
            const compatible = available.filter(mut =>
                MutationCatalog._isCompatible(mut, result)
            );
            if (compatible.length === 0) break;

            // Boss gets higher-tier mutations more often
            const bossWeights = compatible.map(m => {
                switch (m.tier) {
                    case 1: return 1;
                    case 2: return 3;
                    case 3: return 4;
                    default: return 1;
                }
            });

            const total = bossWeights.reduce((a, b) => a + b, 0);
            let r = Math.random() * total;
            for (let j = 0; j < compatible.length; j++) {
                r -= bossWeights[j];
                if (r <= 0) { result.push(compatible[j]); break; }
            }
        }

        return result;
    }
}
