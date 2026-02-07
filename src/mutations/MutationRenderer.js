/**
 * Handles mutation-specific visual rendering.
 * Computes the final color and bone thickness overrides from mutations.
 * Also handles dynamic effects like BERSERKER rage glow.
 */
export class MutationRenderer {
    /**
     * Get the display color for a mutated enemy.
     * @param {string} baseColor - default enemy color (e.g., '#f44')
     * @param {object[]} mutations - mutation definitions
     * @param {Fighter} fighter - for dynamic effects
     * @returns {string} final color
     */
    static getColor(baseColor, mutations, fighter) {
        if (!mutations || mutations.length === 0) return baseColor;

        // Check for MIMIC first — uses player color
        for (const mut of mutations) {
            if (mut.visual && mut.visual.mimicPlayer) {
                return '#eee'; // near-white to mimic player
            }
        }

        // BERSERKER dynamic tint based on HP
        for (const mut of mutations) {
            if (mut.special && mut.special.rageScaling && fighter) {
                const hpRatio = fighter.hp / fighter.maxHp;
                const rage = 1 - hpRatio; // 0 at full HP, 1 at empty
                const r = Math.round(255);
                const g = Math.round(68 * (1 - rage * 0.8));
                const b = Math.round(68 * (1 - rage * 0.8));
                return `rgb(${r},${g},${b})`;
            }
        }

        // Use first mutation's tint that has one
        for (const mut of mutations) {
            if (mut.visual && mut.visual.tint) {
                return mut.visual.tint;
            }
        }

        return baseColor;
    }

    /**
     * Get bone thickness multiplier from mutations.
     */
    static getThicknessMult(mutations) {
        if (!mutations || mutations.length === 0) return 1.0;
        let mult = 1.0;
        for (const mut of mutations) {
            if (mut.visual && mut.visual.thicknessMult) {
                mult *= mut.visual.thicknessMult;
            }
        }
        return mult;
    }

    /**
     * Get outline color (for ARMORED, GIANT, etc.), or null.
     */
    static getOutlineColor(mutations) {
        if (!mutations || mutations.length === 0) return null;
        for (const mut of mutations) {
            if (mut.visual && mut.visual.outline) {
                return mut.visual.outline;
            }
        }
        return null;
    }

    /**
     * Get alpha for semi-transparent mutations (MIMIC).
     */
    static getAlpha(mutations) {
        if (!mutations || mutations.length === 0) return 1.0;
        for (const mut of mutations) {
            if (mut.visual && mut.visual.alpha) {
                return mut.visual.alpha;
            }
        }
        return 1.0;
    }

    /**
     * Get mutation name labels for HUD display.
     */
    static getLabels(mutations) {
        if (!mutations || mutations.length === 0) return [];
        return mutations.map(m => m.name);
    }
}
