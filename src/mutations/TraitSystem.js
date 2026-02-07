/**
 * TraitSystem: 5-axis stat computation engine.
 *
 * Every mutation declares axis shifts across 5 tradeoff axes.
 * Stacked mutations sum their shifts (clamped to ±1.5).
 * Derived stats flow from axis positions through computeStats().
 */
export class TraitSystem {
    /**
     * Compute derived stat multipliers from axis positions.
     * @param {{massSpeed, armorAgility, sizePrecision, complexStable, densityFragility}} axes
     * @returns {object} Derived stat multipliers
     */
    static computeStats(axes) {
        const ms = norm(axes.massSpeed || 0);
        const aa = norm(axes.armorAgility || 0);
        const sp = norm(axes.sizePrecision || 0);
        const cs = norm(axes.complexStable || 0);
        const df = norm(axes.densityFragility || 0);

        return {
            // Mass ←→ Speed
            mass:             lerp(2.0, 0.4, ms),
            moveSpeed:        lerp(0.5, 1.6, ms),
            knockbackResist:  lerp(2.5, 0.3, ms),
            attackSpeed:      lerp(0.6, 1.4, ms),
            baseDamage:       lerp(1.5, 0.6, ms),

            // Armor ←→ Agility
            damageReduction:  lerp(0.5, 0.0, aa),
            recoveryFrames:   lerp(1.5, 0.7, aa),
            canDash:          (axes.armorAgility || 0) > -0.5,
            movePenalty:      lerp(0.7, 1.0, aa),

            // Size ←→ Precision
            skeletonScale:    lerp(1.8, 0.5, sp),
            hitboxScale:      lerp(1.6, 0.6, sp),
            hurtboxScale:     lerp(1.8, 0.5, sp),
            startupFrames:    lerp(1.4, 0.7, sp),
            maxHP:            lerp(2.5, 0.4, sp),

            // Complexity ←→ Stability
            neuralCostMult:   lerp(2.0, 1.0, cs),
            hurtboxSurface:   lerp(1.5, 1.0, cs),

            // Density ←→ Fragility
            boneHPMult:       lerp(2.0, 0.4, df),
            jointHPMult:      lerp(2.0, 0.4, df),
            boneDensity:      lerp(2.0, 0.5, df),
        };
    }

    /**
     * Sum axis shifts from multiple mutations, clamping to ±1.5.
     * @param {object[]} mutations - array of mutation definitions with axis shifts
     * @returns {{massSpeed, armorAgility, sizePrecision, complexStable, densityFragility}}
     */
    static sumAxes(mutations) {
        const axes = {
            massSpeed: 0,
            armorAgility: 0,
            sizePrecision: 0,
            complexStable: 0,
            densityFragility: 0,
        };

        for (const mut of mutations) {
            if (!mut.axes) continue;
            axes.massSpeed += mut.axes.massSpeed || 0;
            axes.armorAgility += mut.axes.armorAgility || 0;
            axes.sizePrecision += mut.axes.sizePrecision || 0;
            axes.complexStable += mut.axes.complexStable || 0;
            axes.densityFragility += mut.axes.densityFragility || 0;
        }

        // Clamp
        for (const key of Object.keys(axes)) {
            axes[key] = Math.max(-1.5, Math.min(1.5, axes[key]));
        }

        return axes;
    }
}

function norm(v) { return (v + 1.5) / 3; } // [-1.5, +1.5] → [0, 1]
function lerp(min, max, t) { return min + (max - min) * t; }
