/**
 * All attack move definitions. Each move specifies animation, frame data,
 * damage, knockback, hitbox placement, and contextual requirements.
 */

export const MOVES = {
    // === STANDING PUNCHES ===
    jab: {
        name: 'jab',
        animation: 'punch_jab',
        startup: 3,
        active: 4,
        recovery: 5,
        damage: 8,
        knockback: { x: 4, y: -1 },
        hitstun: 10,
        attackHeight: 'high',
        hitboxes: [{
            bone: 'forearmR',
            localOffset: { x: 0.7, y: 0 },
            width: 1.0,
            height: 0.6,
        }],
        comboStep: 'starter',
        priority: 1,
    },

    cross: {
        name: 'cross',
        animation: 'punch_cross',
        startup: 5,
        active: 5,
        recovery: 6,
        damage: 12,
        knockback: { x: 6, y: -2 },
        hitstun: 12,
        attackHeight: 'high',
        hitboxes: [{
            bone: 'forearmR',
            localOffset: { x: 0.8, y: 0 },
            width: 1.2,
            height: 0.6,
        }],
        comboStep: 'chain2',
        priority: 2,
    },

    hook: {
        name: 'hook',
        animation: 'punch_hook',
        startup: 6,
        active: 4,
        recovery: 8,
        damage: 18,
        knockback: { x: 10, y: -3 },
        hitstun: 16,
        attackHeight: 'high',
        hitboxes: [{
            bone: 'forearmR',
            localOffset: { x: 0.6, y: 0 },
            width: 1.4,
            height: 0.8,
        }],
        comboStep: 'finisher',
        priority: 3,
    },

    // === STANDING KICKS ===
    front_kick: {
        name: 'front_kick',
        animation: 'kick_front',
        startup: 5,
        active: 5,
        recovery: 6,
        damage: 12,
        knockback: { x: 7, y: -2 },
        hitstun: 12,
        attackHeight: 'mid',
        hitboxes: [{
            bone: 'shinR',
            localOffset: { x: 0.6, y: 0 },
            width: 1.2,
            height: 0.7,
        }],
        comboStep: 'starter',
        priority: 2,
    },

    high_kick: {
        name: 'high_kick',
        animation: 'kick_high',
        startup: 7,
        active: 4,
        recovery: 7,
        damage: 15,
        knockback: { x: 5, y: -5 },
        hitstun: 14,
        attackHeight: 'high',
        hitboxes: [{
            bone: 'shinR',
            localOffset: { x: 0.7, y: 0 },
            width: 1.3,
            height: 0.7,
        }],
        comboStep: 'chain2',
        priority: 3,
    },

    roundhouse: {
        name: 'roundhouse',
        animation: 'kick_roundhouse',
        startup: 8,
        active: 5,
        recovery: 10,
        damage: 22,
        knockback: { x: 12, y: -4 },
        hitstun: 18,
        attackHeight: 'high',
        hitboxes: [{
            bone: 'shinR',
            localOffset: { x: 0.5, y: 0 },
            width: 1.6,
            height: 0.8,
        }],
        comboStep: 'finisher',
        priority: 4,
    },

    // === CROUCH ATTACKS ===
    uppercut: {
        name: 'uppercut',
        animation: 'punch_uppercut',
        startup: 6,
        active: 5,
        recovery: 8,
        damage: 16,
        knockback: { x: 3, y: -14 },
        hitstun: 18,
        attackHeight: 'high',
        hitboxes: [{
            bone: 'forearmR',
            localOffset: { x: 0.7, y: 0 },
            width: 1.0,
            height: 1.0,
        }],
        requiresCrouch: true,
        comboStep: 'starter',
        priority: 3,
    },

    sweep: {
        name: 'sweep',
        animation: 'kick_sweep',
        startup: 6,
        active: 7,
        recovery: 8,
        damage: 10,
        knockback: { x: 4, y: -8 },
        hitstun: 20,
        attackHeight: 'low',
        hitboxes: [{
            bone: 'shinR',
            localOffset: { x: 0.5, y: 0 },
            width: 1.8,
            height: 0.5,
        }],
        requiresCrouch: true,
        comboStep: 'starter',
        priority: 2,
    },

    // === AIR ATTACKS ===
    air_jab: {
        name: 'air_jab',
        animation: 'punch_air',
        startup: 4,
        active: 4,
        recovery: 5,
        damage: 8,
        knockback: { x: 5, y: 2 },
        hitstun: 10,
        attackHeight: 'mid',
        hitboxes: [{
            bone: 'forearmR',
            localOffset: { x: 0.7, y: 0 },
            width: 1.0,
            height: 0.6,
        }],
        requiresAirborne: true,
        comboStep: 'starter',
        priority: 1,
    },

    air_kick: {
        name: 'air_kick',
        animation: 'kick_air',
        startup: 5,
        active: 5,
        recovery: 6,
        damage: 12,
        knockback: { x: 6, y: 3 },
        hitstun: 12,
        attackHeight: 'mid',
        hitboxes: [{
            bone: 'shinR',
            localOffset: { x: 0.6, y: 0 },
            width: 1.3,
            height: 0.7,
        }],
        requiresAirborne: true,
        comboStep: 'starter',
        priority: 2,
    },

    stomp: {
        name: 'stomp',
        animation: 'kick_stomp',
        startup: 6,
        active: 5,
        recovery: 8,
        damage: 18,
        knockback: { x: 1, y: 10 },
        hitstun: 16,
        attackHeight: 'low',
        hitboxes: [{
            bone: 'footR',
            localOffset: { x: 0.5, y: 0 },
            width: 1.4,
            height: 1.0,
        }],
        requiresAirborne: true,
        comboStep: 'finisher',
        priority: 3,
    },

    // === DASH ATTACKS ===
    dash_punch: {
        name: 'dash_punch',
        animation: 'punch_dash',
        startup: 3,
        active: 5,
        recovery: 8,
        damage: 15,
        knockback: { x: 10, y: -3 },
        hitstun: 14,
        attackHeight: 'mid',
        hitboxes: [{
            bone: 'forearmR',
            localOffset: { x: 0.8, y: 0 },
            width: 1.2,
            height: 0.7,
        }],
        requiresDash: true,
        comboStep: 'starter',
        priority: 3,
    },

    dropkick: {
        name: 'dropkick',
        animation: 'kick_dropkick',
        startup: 8,
        active: 6,
        recovery: 10,
        damage: 25,
        knockback: { x: 12, y: -6 },
        hitstun: 18,
        attackHeight: 'mid',
        hitboxes: [{
            bone: 'shinR',
            localOffset: { x: 0.5, y: 0 },
            width: 1.4,
            height: 0.8,
        }],
        requiresDash: true,
        requiresAirborne: true,
        comboStep: 'finisher',
        priority: 4,
    },
};

/**
 * Combo chain definitions. Maps current move + next input → next move.
 */
export const COMBO_CHAINS = {
    // Punch chains
    'jab+punch': 'cross',
    'cross+punch': 'hook',
    'jab+kick': 'front_kick',

    // Kick chains
    'front_kick+kick': 'high_kick',
    'high_kick+kick': 'roundhouse',
    'front_kick+punch': 'cross',

    // Crouch chains
    'uppercut+punch': 'hook',
};
