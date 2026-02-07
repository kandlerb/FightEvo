/**
 * Raw mutation definitions. Each mutation declares:
 * - tier: 1 (wave 3+), 2 (wave 6+), 3 (wave 10+)
 * - axes: axis shifts for TraitSystem
 * - boneChanges: skeleton modifications (length/thickness multipliers)
 * - visual: rendering overrides (tint color, outline, thickness mult)
 * - special: per-mutation runtime behaviors
 * - incompatible: list of mutation names that can't co-exist
 */

export const MUTATIONS = {
    // ═══════════════════════════════════════════════════════
    // TIER 1 — Minor (Wave 3+)
    // ═══════════════════════════════════════════════════════

    LONG_ARMS: {
        name: 'LONG_ARMS',
        tier: 1,
        description: 'Extended reach, slightly slower swings',
        axes: { massSpeed: 0, armorAgility: 0.2, sizePrecision: -0.2, complexStable: -0.1, densityFragility: 0 },
        boneChanges: {
            upperArmL: { lengthMult: 1.3 },
            upperArmR: { lengthMult: 1.3 },
            forearmL:  { lengthMult: 1.4 },
            forearmR:  { lengthMult: 1.4 },
        },
        visual: { tint: '#88aaff', thicknessMult: 1.0, outline: null },
        special: {},
        incompatible: [],
    },

    HEAVY_LEGS: {
        name: 'HEAVY_LEGS',
        tier: 1,
        description: 'Powerful kicks, slower movement',
        axes: { massSpeed: -0.4, armorAgility: -0.1, sizePrecision: -0.1, complexStable: 0, densityFragility: 0 },
        boneChanges: {
            thighL: { lengthMult: 1.1, thicknessMult: 1.4 },
            thighR: { lengthMult: 1.1, thicknessMult: 1.4 },
            shinL:  { lengthMult: 1.2, thicknessMult: 1.3 },
            shinR:  { lengthMult: 1.2, thicknessMult: 1.3 },
        },
        visual: { tint: '#aa8855', thicknessMult: 1.0, outline: null },
        special: { kickDamageMult: 1.3 },
        incompatible: [],
    },

    QUICK_TWITCH: {
        name: 'QUICK_TWITCH',
        tier: 1,
        description: 'Fast and fragile',
        axes: { massSpeed: 0.5, armorAgility: 0.3, sizePrecision: 0.2, complexStable: 0, densityFragility: 0.6 },
        boneChanges: {},
        visual: { tint: '#88ff88', thicknessMult: 0.8, outline: null },
        special: {},
        incompatible: ['ARMORED'],
    },

    THICK_SKULL: {
        name: 'THICK_SKULL',
        tier: 1,
        description: 'Armored head, faster stagger recovery',
        axes: { massSpeed: -0.1, armorAgility: -0.2, sizePrecision: -0.1, complexStable: -0.1, densityFragility: 0 },
        boneChanges: {
            head: { lengthMult: 1.4, thicknessMult: 1.5 },
        },
        visual: { tint: '#ccccdd', thicknessMult: 1.0, outline: null },
        special: { headDamageReduction: 0.5, hitstunReduction: 0.3 },
        incompatible: [],
    },

    TAIL: {
        name: 'TAIL',
        tier: 1,
        description: 'Tail grants rear attack',
        axes: { massSpeed: 0, armorAgility: 0, sizePrecision: 0, complexStable: -0.2, densityFragility: 0 },
        boneChanges: {},
        visual: { tint: '#ddaa77', thicknessMult: 1.0, outline: null },
        special: { addTail: true },
        incompatible: [],
    },

    SPRINGY: {
        name: 'SPRINGY',
        tier: 1,
        description: 'Higher jumps, bouncy, fragile',
        axes: { massSpeed: 0.3, armorAgility: 0.4, sizePrecision: 0.1, complexStable: 0, densityFragility: 0.3 },
        boneChanges: {},
        visual: { tint: '#aaffdd', thicknessMult: 0.9, outline: null },
        special: { jumpMult: 1.5, wallBounce: true },
        incompatible: [],
    },

    ASYMMETRIC: {
        name: 'ASYMMETRIC',
        tier: 1,
        description: 'One arm longer — asymmetric fighting',
        axes: { massSpeed: 0, armorAgility: 0, sizePrecision: 0, complexStable: -0.2, densityFragility: 0 },
        boneChanges: {
            upperArmR: { lengthMult: 1.4 },
            forearmR:  { lengthMult: 1.5 },
            upperArmL: { lengthMult: 0.9 },
            forearmL:  { lengthMult: 0.9 },
        },
        visual: { tint: '#ddddaa', thicknessMult: 1.0, outline: null },
        special: {},
        incompatible: [],
    },

    // ═══════════════════════════════════════════════════════
    // TIER 2 — Significant (Wave 6+)
    // ═══════════════════════════════════════════════════════

    EXTRA_ARMS: {
        name: 'EXTRA_ARMS',
        tier: 2,
        description: 'Four arms, independent attacks',
        axes: { massSpeed: -0.1, armorAgility: 0, sizePrecision: 0, complexStable: -0.6, densityFragility: 0 },
        boneChanges: {},
        visual: { tint: '#ff88cc', thicknessMult: 1.0, outline: null },
        special: { addExtraArms: true, extraOutputs: 2 },
        incompatible: ['MIMIC'],
    },

    ARMORED: {
        name: 'ARMORED',
        tier: 2,
        description: 'Tank — slow, tough, immovable',
        axes: { massSpeed: -0.3, armorAgility: -0.8, sizePrecision: -0.1, complexStable: 0, densityFragility: -0.8 },
        boneChanges: {},
        visual: { tint: '#aaaacc', thicknessMult: 1.6, outline: '#ddd' },
        special: { noDash: true },
        incompatible: ['QUICK_TWITCH', 'VOLATILE', 'BERSERKER'],
    },

    STRETCHY: {
        name: 'STRETCHY',
        tier: 2,
        description: 'Elastic limbs — huge reach, joints pop easily',
        axes: { massSpeed: 0.1, armorAgility: 0.2, sizePrecision: -0.3, complexStable: -0.2, densityFragility: 0.3 },
        boneChanges: {},
        visual: { tint: '#ffcc88', thicknessMult: 0.7, outline: null },
        special: { attackReachMult: 1.8, boneHPOverride: 3.0, jointHPOverride: 0.4 },
        incompatible: [],
    },

    BERSERKER: {
        name: 'BERSERKER',
        tier: 2,
        description: 'Rage scales with damage taken — cannot block',
        axes: { massSpeed: 0.2, armorAgility: 0.5, sizePrecision: 0, complexStable: -0.1, densityFragility: 0 },
        boneChanges: {},
        visual: { tint: '#ff4444', thicknessMult: 1.0, outline: null },
        special: { noBlock: true, rageScaling: true },
        incompatible: ['ARMORED'],
    },

    CRAWLER: {
        name: 'CRAWLER',
        tier: 2,
        description: 'Quadruped — crawls, lunges, sweeps',
        axes: { massSpeed: -0.1, armorAgility: 0.3, sizePrecision: -0.2, complexStable: -0.4, densityFragility: -0.3 },
        boneChanges: {
            forearmL: { lengthMult: 1.8 },
            forearmR: { lengthMult: 1.8 },
            shinL:    { lengthMult: 1.5 },
            shinR:    { lengthMult: 1.5 },
        },
        visual: { tint: '#886644', thicknessMult: 1.1, outline: null },
        special: { crawlerMode: true },
        incompatible: [],
    },

    REGEN: {
        name: 'REGEN',
        tier: 2,
        description: 'Regenerates HP slowly',
        axes: { massSpeed: -0.1, armorAgility: -0.1, sizePrecision: 0, complexStable: 0, densityFragility: 0 },
        boneChanges: {},
        visual: { tint: '#44ff88', thicknessMult: 1.0, outline: null },
        special: { regenPerSec: 2 },
        incompatible: [],
    },

    VENOMOUS: {
        name: 'VENOMOUS',
        tier: 2,
        description: 'Attacks apply damage-over-time',
        axes: { massSpeed: 0.1, armorAgility: 0.1, sizePrecision: 0.2, complexStable: -0.2, densityFragility: 0 },
        boneChanges: {},
        visual: { tint: '#88ff44', thicknessMult: 0.9, outline: '#4a4' },
        special: { venomDPS: 1.5, venomDuration: 180 },
        incompatible: [],
    },

    MULTI_HEAD: {
        name: 'MULTI_HEAD',
        tier: 2,
        description: 'Two heads — panoramic awareness, stagger resist',
        axes: { massSpeed: -0.2, armorAgility: -0.1, sizePrecision: -0.2, complexStable: -0.5, densityFragility: 0 },
        boneChanges: {},
        visual: { tint: '#ccaaff', thicknessMult: 1.0, outline: null },
        special: { addSecondHead: true, hitstunReduction: 0.5, extraInputs: 4 },
        incompatible: [],
    },

    // ═══════════════════════════════════════════════════════
    // TIER 3 — Dramatic (Wave 10+)
    // ═══════════════════════════════════════════════════════

    GIANT: {
        name: 'GIANT',
        tier: 3,
        description: 'Massive — slow, powerful, big target',
        axes: { massSpeed: -0.7, armorAgility: -0.3, sizePrecision: -0.9, complexStable: 0, densityFragility: 0 },
        boneChanges: {
            _all: { lengthMult: 1.8, thicknessMult: 1.8 },
        },
        visual: { tint: '#ffdd44', thicknessMult: 2.0, outline: '#aa8800' },
        special: { screenShakeOnLand: true },
        incompatible: ['PARASITE', 'SPLIT', 'MIMIC'],
    },

    SPLIT: {
        name: 'SPLIT',
        tier: 3,
        description: 'On death, spawns 2 smaller copies',
        axes: { massSpeed: 0.3, armorAgility: 0.2, sizePrecision: 0.3, complexStable: -0.3, densityFragility: 0 },
        boneChanges: {},
        visual: { tint: '#ff88ff', thicknessMult: 1.0, outline: null },
        special: { splitOnDeath: true, splitCount: 2, splitScale: 0.65, splitHP: 0.4, splitDamage: 0.6 },
        incompatible: ['GIANT'],
    },

    MIMIC: {
        name: 'MIMIC',
        tier: 3,
        description: 'Clones player appearance — uncanny',
        axes: { massSpeed: 0, armorAgility: 0, sizePrecision: 0, complexStable: -0.4, densityFragility: 0 },
        boneChanges: {},
        visual: { tint: null, thicknessMult: 1.0, outline: null, mimicPlayer: true, alpha: 0.85 },
        special: { extraInputs: 3 },
        incompatible: ['GIANT', 'EXTRA_ARMS'],
    },

    VOLATILE: {
        name: 'VOLATILE',
        tier: 3,
        description: 'Glass cannon — explodes on death',
        axes: { massSpeed: 0.4, armorAgility: 0.5, sizePrecision: 0.2, complexStable: -0.1, densityFragility: 0 },
        boneChanges: {},
        visual: { tint: '#ff6600', thicknessMult: 0.9, outline: '#ff3300' },
        special: { explodeOnDeath: true, explosionRadius: 120, explosionDamage: 30 },
        incompatible: ['ARMORED'],
    },

    PARASITE: {
        name: 'PARASITE',
        tier: 3,
        description: 'Tiny, fast, latches onto player',
        axes: { massSpeed: 0.7, armorAgility: 0.6, sizePrecision: 0.8, complexStable: -0.3, densityFragility: 0.5 },
        boneChanges: {
            _all: { lengthMult: 0.45, thicknessMult: 0.5 },
        },
        visual: { tint: '#aa44aa', thicknessMult: 0.5, outline: null },
        special: { canLatch: true, latchDPS: 3, extraOutputs: 1 },
        incompatible: ['GIANT'],
    },
};

/**
 * Get tier-appropriate mutation list for a given wave number.
 */
export function getMutationsForWave(waveNumber) {
    const available = [];
    for (const mut of Object.values(MUTATIONS)) {
        if (mut.tier === 1 && waveNumber >= 3) available.push(mut);
        if (mut.tier === 2 && waveNumber >= 6) available.push(mut);
        if (mut.tier === 3 && waveNumber >= 10) available.push(mut);
    }
    return available;
}
