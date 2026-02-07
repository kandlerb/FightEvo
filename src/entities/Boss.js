import { Enemy } from './Enemy.js';
import { CONFIG } from '../config.js';
import { MutationRenderer } from '../mutations/MutationRenderer.js';

/**
 * Boss enemy — dominant genome with biased mutations, extra HP,
 * gold tint, 2x bone thickness, and a name plate.
 */
export class Boss extends Enemy {
    constructor(x, y, genome, mutations, generation) {
        super(x, y, genome, mutations);

        this.isBoss = true;
        this.generation = generation;
        this.bossName = this._buildName();
    }

    /**
     * Build a display name for the boss.
     */
    _buildName() {
        let name = `BOSS — Gen ${this.generation}`;
        if (this.mutations && this.mutations.length > 0) {
            const names = this.mutations.map(m => m.name);
            name += ` [${names.join('+')}]`;
        }
        return name;
    }

    /**
     * Override render opts for boss visuals:
     * - 2x bone thickness (on top of any mutation thickness)
     * - Gold outline
     * - Gold tint base color
     */
    _getRenderOpts() {
        const baseMult = this.mutations && this.mutations.length > 0
            ? MutationRenderer.getThicknessMult(this.mutations)
            : 1.0;

        return {
            thicknessMult: baseMult * CONFIG.BOSS_BONE_THICKNESS,
            outlineColor: '#ffd700', // gold outline
            alpha: this.mutations && this.mutations.length > 0
                ? MutationRenderer.getAlpha(this.mutations)
                : 1.0,
        };
    }

    /**
     * Override color to use gold tint (unless mutation overrides).
     */
    update(dt, player, allEnemies) {
        super.update(dt, player, allEnemies);

        // Boss base color is gold, unless mutation provides specific color
        const mutColor = this.mutations && this.mutations.length > 0
            ? MutationRenderer.getColor('#ffd700', this.mutations, this)
            : null;

        this.color = mutColor || '#ffd700';
    }
}
