/**
 * Damage zone multipliers. When a hit lands on a bone, the zone determines
 * how HP damage, knockback, hitstun, and structural damage are modified.
 */

export const DAMAGE_ZONES = {
    head: {
        hpMult: 2.0,
        kbMult: 3.0,
        stunMult: 1.5,
        structMult: 1.5,
    },

    neck: {
        hpMult: 1.8,
        kbMult: 1.5,
        stunMult: 2.0,
        structMult: 2.0,
    },

    torso: {
        hpMult: 1.0,
        kbMult: 1.0,
        stunMult: 1.0,
        structMult: 0.8,
    },

    arms: {
        hpMult: 0.7,
        kbMult: 0.5,
        stunMult: 0.8,
        structMult: 1.2,
    },

    legs: {
        hpMult: 0.8,
        kbMult: 0.6,
        stunMult: 0.8,
        structMult: 1.0,
    },

    knee: {
        hpMult: 1.2,
        kbMult: 0.8,
        stunMult: 1.5,
        structMult: 2.5,
    },

    elbow: {
        hpMult: 1.0,
        kbMult: 0.5,
        stunMult: 1.3,
        structMult: 2.0,
    },

    groin: {
        hpMult: 1.5,
        kbMult: 0.3,
        stunMult: 2.5,
        structMult: 2.0,
    },
};

/**
 * Maps bone names to their damage zone.
 */
export const BONE_TO_ZONE = {
    head: 'head',
    neck: 'neck',
    spine: 'torso',
    shoulderL: 'torso',
    shoulderR: 'torso',
    upperArmL: 'arms',
    upperArmR: 'arms',
    forearmL: 'arms',
    forearmR: 'arms',
    handL: 'arms',
    handR: 'arms',
    hipL: 'torso',
    hipR: 'torso',
    thighL: 'legs',
    thighR: 'legs',
    shinL: 'legs',
    shinR: 'legs',
    footL: 'legs',
    footR: 'legs',
};
