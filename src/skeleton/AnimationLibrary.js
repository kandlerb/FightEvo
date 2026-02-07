import { Pose } from './Pose.js';
import { Animation } from './Animation.js';

/**
 * All named animations. Pose rotations are OFFSETS from each bone's defaultRotation.
 * Positive = clockwise, negative = counter-clockwise.
 * Only bones that move from their default need to be listed.
 */

const P = (rotations) => new Pose(rotations);

// --- IDLE: subtle breathing sway ---
const idle = new Animation('idle', [
    { pose: P({}), duration: 30 },
    {
        pose: P({
            spine: 0.02,
            shoulderL: 0.03,
            shoulderR: -0.03,
            upperArmL: 0.05,
            upperArmR: -0.05,
        }),
        duration: 30,
    },
], { loop: true });

// --- WALK FORWARD: alternating leg/arm swing ---
const walk_forward = new Animation('walk_forward', [
    {
        pose: P({
            hipL: -0.3, thighL: 0.15, shinL: -0.1,
            hipR: 0.3, thighR: -0.15, shinR: 0.2,
            shoulderL: 0.15, upperArmL: 0.2,
            shoulderR: -0.15, upperArmR: -0.2,
            spine: 0.03,
        }),
        duration: 10,
    },
    {
        pose: P({
            hipL: 0.3, thighL: -0.15, shinL: 0.2,
            hipR: -0.3, thighR: 0.15, shinR: -0.1,
            shoulderL: -0.15, upperArmL: -0.2,
            shoulderR: 0.15, upperArmR: 0.2,
            spine: -0.03,
        }),
        duration: 10,
    },
], { loop: true });

// --- WALK BACKWARD: reversed walk with cautious lean ---
const walk_backward = new Animation('walk_backward', [
    {
        pose: P({
            hipL: 0.25, thighL: -0.1, shinL: 0.15,
            hipR: -0.25, thighR: 0.1, shinR: -0.1,
            shoulderL: -0.1, upperArmL: -0.15,
            shoulderR: 0.1, upperArmR: 0.15,
            spine: -0.05,
        }),
        duration: 12,
    },
    {
        pose: P({
            hipL: -0.25, thighL: 0.1, shinL: -0.1,
            hipR: 0.25, thighR: -0.1, shinR: 0.15,
            shoulderL: 0.1, upperArmL: 0.15,
            shoulderR: -0.1, upperArmR: -0.15,
            spine: 0.05,
        }),
        duration: 12,
    },
], { loop: true });

// --- JUMP RISE: legs tuck, arms up ---
const jump_rise = new Animation('jump_rise', [
    { pose: P({}), duration: 2 },
    {
        pose: P({
            hipL: -0.15, thighL: -0.3, shinL: 0.5,
            hipR: 0.15, thighR: 0.3, shinR: -0.5,
            shoulderL: -0.2, upperArmL: -0.3,
            shoulderR: 0.2, upperArmR: 0.3,
            spine: -0.05,
        }),
        duration: 8,
    },
], { loop: false });

// --- JUMP FLOAT: held while airborne ---
const jump_float = new Animation('jump_float', [
    {
        pose: P({
            hipL: -0.1, thighL: -0.2, shinL: 0.3,
            hipR: 0.1, thighR: 0.2, shinR: -0.3,
            shoulderL: -0.15, upperArmL: -0.2, forearmL: -0.1,
            shoulderR: 0.15, upperArmR: 0.2, forearmR: 0.1,
        }),
        duration: 20,
    },
    {
        pose: P({
            hipL: -0.12, thighL: -0.22, shinL: 0.32,
            hipR: 0.12, thighR: 0.22, shinR: -0.32,
            shoulderL: -0.17, upperArmL: -0.22, forearmL: -0.12,
            shoulderR: 0.17, upperArmR: 0.22, forearmR: 0.12,
        }),
        duration: 20,
    },
], { loop: true });

// --- JUMP LAND: quick settle ---
const jump_land = new Animation('jump_land', [
    {
        pose: P({
            hipL: 0.1, thighL: 0.15, shinL: -0.2,
            hipR: -0.1, thighR: -0.15, shinR: 0.2,
            spine: 0.08,
            shoulderL: 0.1, shoulderR: -0.1,
        }),
        duration: 3,
    },
    { pose: P({}), duration: 3 },
], { loop: false });

// --- CROUCH: lower stance ---
const crouch = new Animation('crouch', [
    { pose: P({}), duration: 3 },
    {
        pose: P({
            spine: 0.2,
            hipL: 0.25, thighL: 0.3, shinL: -0.4,
            hipR: -0.25, thighR: -0.3, shinR: 0.4,
            shoulderL: 0.15, upperArmL: 0.2, forearmL: 0.15,
            shoulderR: -0.15, upperArmR: -0.2, forearmR: -0.15,
        }),
        duration: 3,
    },
], { loop: false, hold: true });

// --- SLIDE: ground slide, low profile ---
const slide = new Animation('slide', [
    {
        pose: P({
            spine: 0.6,
            hipL: 0.1, thighL: 0.5, shinL: -0.2,
            hipR: -0.4, thighR: -0.3, shinR: 0.1,
            shoulderL: 0.3, upperArmL: 0.4, forearmL: 0.2,
            shoulderR: -0.3, upperArmR: 0.1,
        }),
        duration: 15,
    },
], { loop: false, hold: true });

// --- WALL SLIDE: clinging to wall ---
const wall_slide = new Animation('wall_slide', [
    {
        pose: P({
            spine: -0.05,
            shoulderL: -0.3, upperArmL: -0.6, forearmL: -0.3,
            shoulderR: 0.3, upperArmR: 0.6, forearmR: 0.3,
            hipL: -0.1, thighL: -0.15, shinL: 0.2,
            hipR: 0.1, thighR: 0.15, shinR: -0.2,
        }),
        duration: 15,
    },
    {
        pose: P({
            spine: -0.03,
            shoulderL: -0.28, upperArmL: -0.58, forearmL: -0.28,
            shoulderR: 0.28, upperArmR: 0.58, forearmR: 0.28,
            hipL: -0.12, thighL: -0.17, shinL: 0.22,
            hipR: 0.12, thighR: 0.17, shinR: -0.22,
        }),
        duration: 15,
    },
], { loop: true });

// --- DASH: forward burst ---
const dash_forward = new Animation('dash_forward', [
    {
        pose: P({
            spine: 0.15,
            hipL: -0.4, thighL: 0.2, shinL: -0.1,
            hipR: 0.2, thighR: -0.1, shinR: 0.05,
            shoulderL: 0.2, upperArmL: 0.6, forearmL: 0.2,
            shoulderR: -0.3, upperArmR: -0.4,
        }),
        duration: 8,
    },
], { loop: false, hold: true });

// --- FAST FALL: tucked downward ---
const fast_fall = new Animation('fast_fall', [
    {
        pose: P({
            spine: 0.1,
            hipL: 0.15, thighL: 0.3, shinL: -0.2,
            hipR: -0.15, thighR: -0.3, shinR: 0.2,
            shoulderL: 0.3, upperArmL: 0.4,
            shoulderR: -0.3, upperArmR: -0.4,
        }),
        duration: 10,
    },
], { loop: false, hold: true });

// ============================================================
// ATTACK ANIMATIONS
// ============================================================

// --- PUNCH: Jab (fast straight punch) ---
const punch_jab = new Animation('punch_jab', [
    {
        pose: P({
            shoulderR: -0.2, upperArmR: -0.4, forearmR: -0.3,
            spine: 0.05,
        }),
        duration: 3,
    },
    {
        pose: P({
            shoulderR: -0.6, upperArmR: -0.8, forearmR: 0.1,
            spine: 0.1,
            shoulderL: 0.15, upperArmL: 0.3, forearmL: 0.4,
        }),
        duration: 4,
    },
    {
        pose: P({
            shoulderR: -0.3, upperArmR: -0.4, forearmR: 0.0,
            spine: 0.03,
        }),
        duration: 5,
    },
], { loop: false });

// --- PUNCH: Cross (strong straight) ---
const punch_cross = new Animation('punch_cross', [
    {
        pose: P({
            shoulderR: 0.1, upperArmR: 0.2,
            spine: -0.1,
        }),
        duration: 5,
    },
    {
        pose: P({
            shoulderR: -0.7, upperArmR: -0.9, forearmR: 0.15,
            spine: 0.15,
            shoulderL: 0.2, upperArmL: 0.35, forearmL: 0.5,
        }),
        duration: 5,
    },
    {
        pose: P({
            shoulderR: -0.2, upperArmR: -0.3,
            spine: 0.05,
        }),
        duration: 4,
    },
], { loop: false });

// --- PUNCH: Hook (wide swing finisher) ---
const punch_hook = new Animation('punch_hook', [
    {
        pose: P({
            shoulderR: 0.3, upperArmR: 0.5, forearmR: 0.6,
            spine: -0.15,
        }),
        duration: 6,
    },
    {
        pose: P({
            shoulderR: -0.5, upperArmR: -0.3, forearmR: -0.8,
            spine: 0.2,
            shoulderL: 0.2, upperArmL: 0.3,
        }),
        duration: 4,
    },
    {
        pose: P({
            shoulderR: -0.1, upperArmR: 0.0,
            spine: 0.05,
        }),
        duration: 8,
    },
], { loop: false });

// --- PUNCH: Uppercut (from crouch, launches) ---
const punch_uppercut = new Animation('punch_uppercut', [
    {
        pose: P({
            spine: 0.3,
            shoulderR: 0.3, upperArmR: 0.6, forearmR: 0.5,
            hipL: 0.2, thighL: 0.3, shinL: -0.3,
            hipR: -0.2, thighR: -0.3, shinR: 0.3,
        }),
        duration: 6,
    },
    {
        pose: P({
            spine: -0.15,
            shoulderR: -0.8, upperArmR: -1.2, forearmR: -0.3,
            shoulderL: 0.2, upperArmL: 0.3,
        }),
        duration: 5,
    },
    {
        pose: P({
            spine: -0.05,
            shoulderR: -0.3, upperArmR: -0.5,
        }),
        duration: 5,
    },
], { loop: false });

// --- KICK: Front kick ---
const kick_front = new Animation('kick_front', [
    {
        pose: P({
            hipR: -0.2, thighR: -0.2, shinR: 0.4,
            spine: 0.05,
        }),
        duration: 5,
    },
    {
        pose: P({
            hipR: -0.5, thighR: -0.6, shinR: 0.1,
            spine: 0.08,
            shoulderL: 0.1, shoulderR: -0.1,
        }),
        duration: 5,
    },
    {
        pose: P({
            hipR: -0.1, thighR: 0.0, shinR: 0.1,
            spine: 0.02,
        }),
        duration: 4,
    },
], { loop: false });

// --- KICK: High kick ---
const kick_high = new Animation('kick_high', [
    {
        pose: P({
            hipR: -0.3, thighR: -0.4, shinR: 0.5,
            spine: 0.1,
        }),
        duration: 7,
    },
    {
        pose: P({
            hipR: -0.7, thighR: -1.0, shinR: 0.2,
            spine: 0.12,
            shoulderL: 0.15, shoulderR: -0.15,
        }),
        duration: 4,
    },
    {
        pose: P({
            hipR: -0.1, thighR: 0.0,
            spine: 0.03,
        }),
        duration: 7,
    },
], { loop: false });

// --- KICK: Roundhouse (spin finisher) ---
const kick_roundhouse = new Animation('kick_roundhouse', [
    {
        pose: P({
            spine: -0.2,
            hipR: 0.2, thighR: 0.3, shinR: 0.4,
        }),
        duration: 8,
    },
    {
        pose: P({
            spine: 0.25,
            hipR: -0.8, thighR: -0.9, shinR: 0.1,
            shoulderL: 0.3, shoulderR: -0.3,
            upperArmL: 0.4, upperArmR: -0.4,
        }),
        duration: 5,
    },
    {
        pose: P({
            spine: 0.05,
            hipR: -0.1,
        }),
        duration: 10,
    },
], { loop: false });

// --- KICK: Sweep (low, trips) ---
const kick_sweep = new Animation('kick_sweep', [
    {
        pose: P({
            spine: 0.3,
            hipR: 0.2, thighR: 0.2,
            hipL: 0.2, thighL: 0.3, shinL: -0.3,
        }),
        duration: 6,
    },
    {
        pose: P({
            spine: 0.35,
            hipR: -0.6, thighR: -0.4, shinR: -0.2,
            hipL: 0.3, thighL: 0.4, shinL: -0.4,
        }),
        duration: 7,
    },
    {
        pose: P({
            spine: 0.15,
            hipR: -0.1, thighR: 0.0,
        }),
        duration: 3,
    },
], { loop: false });

// --- KICK: Stomp (downward air) ---
const kick_stomp = new Animation('kick_stomp', [
    {
        pose: P({
            hipR: -0.2, thighR: -0.4, shinR: 0.3,
            spine: -0.05,
        }),
        duration: 6,
    },
    {
        pose: P({
            hipR: 0.4, thighR: 0.7, shinR: 0.2,
            spine: 0.1,
        }),
        duration: 5,
    },
    {
        pose: P({
            hipR: 0.1, thighR: 0.2,
        }),
        duration: 3,
    },
], { loop: false });

// --- KICK: Dropkick (full body horizontal) ---
const kick_dropkick = new Animation('kick_dropkick', [
    {
        pose: P({
            spine: 0.3,
            hipL: -0.2, thighL: -0.3, shinL: 0.2,
            hipR: -0.2, thighR: -0.3, shinR: 0.2,
            shoulderL: 0.2, shoulderR: -0.2,
        }),
        duration: 8,
    },
    {
        pose: P({
            spine: 0.6,
            hipL: -0.5, thighL: -0.5, shinL: 0.05,
            hipR: -0.5, thighR: -0.5, shinR: 0.05,
            shoulderL: 0.4, upperArmL: 0.5,
            shoulderR: -0.4, upperArmR: -0.5,
        }),
        duration: 6,
    },
    {
        pose: P({
            spine: 0.2,
            hipL: -0.1, hipR: -0.1,
        }),
        duration: 6,
    },
], { loop: false });

// --- PUNCH: Air jab ---
const punch_air = new Animation('punch_air', [
    {
        pose: P({
            shoulderR: -0.1, upperArmR: -0.2,
            hipL: -0.1, thighL: -0.2, shinL: 0.3,
            hipR: 0.1, thighR: 0.2, shinR: -0.3,
        }),
        duration: 4,
    },
    {
        pose: P({
            shoulderR: -0.5, upperArmR: -0.7, forearmR: 0.2,
            shoulderL: 0.15, upperArmL: 0.2,
            hipL: -0.1, thighL: -0.2, shinL: 0.3,
            hipR: 0.1, thighR: 0.2, shinR: -0.3,
        }),
        duration: 4,
    },
    {
        pose: P({
            shoulderR: -0.2, upperArmR: -0.3,
            hipL: -0.1, thighL: -0.2, shinL: 0.3,
            hipR: 0.1, thighR: 0.2, shinR: -0.3,
        }),
        duration: 5,
    },
], { loop: false });

// --- KICK: Air kick ---
const kick_air = new Animation('kick_air', [
    {
        pose: P({
            hipR: -0.3, thighR: -0.3, shinR: 0.4,
            hipL: -0.1, thighL: -0.1, shinL: 0.2,
        }),
        duration: 5,
    },
    {
        pose: P({
            hipR: -0.6, thighR: -0.7, shinR: 0.15,
            hipL: 0.1, thighL: 0.1, shinL: 0.1,
            spine: 0.05,
        }),
        duration: 5,
    },
    {
        pose: P({
            hipR: -0.1, thighR: -0.1, shinR: 0.1,
        }),
        duration: 6,
    },
], { loop: false });

// --- PUNCH: Dash punch ---
const punch_dash = new Animation('punch_dash', [
    {
        pose: P({
            spine: 0.2,
            shoulderR: -0.3, upperArmR: -0.5,
            hipL: -0.3, thighL: 0.15,
            hipR: 0.15, thighR: -0.1,
        }),
        duration: 3,
    },
    {
        pose: P({
            spine: 0.15,
            shoulderR: -0.7, upperArmR: -0.9, forearmR: 0.1,
            shoulderL: 0.2, upperArmL: 0.4, forearmL: 0.3,
        }),
        duration: 5,
    },
    {
        pose: P({
            spine: 0.05,
            shoulderR: -0.2,
        }),
        duration: 8,
    },
], { loop: false });

// --- BLOCK: Standing block ---
const block_stand = new Animation('block_stand', [
    {
        pose: P({
            shoulderL: -0.3, upperArmL: -0.5, forearmL: -0.8,
            shoulderR: 0.1, upperArmR: 0.3, forearmR: 0.6,
            spine: -0.05,
        }),
        duration: 4,
    },
], { loop: false, hold: true });

// --- BLOCK: Crouch block ---
const block_crouch = new Animation('block_crouch', [
    {
        pose: P({
            spine: 0.2,
            shoulderL: -0.2, upperArmL: -0.4, forearmL: -0.7,
            shoulderR: 0.1, upperArmR: 0.2, forearmR: 0.5,
            hipL: 0.2, thighL: 0.3, shinL: -0.3,
            hipR: -0.2, thighR: -0.3, shinR: 0.3,
        }),
        duration: 4,
    },
], { loop: false, hold: true });

// --- HIT REACTIONS ---
const hit_stagger = new Animation('hit_stagger', [
    {
        pose: P({
            spine: -0.15,
            shoulderL: 0.2, shoulderR: -0.2,
            upperArmL: 0.3, upperArmR: -0.3,
            neck: 0.1,
        }),
        duration: 5,
    },
    { pose: P({}), duration: 5 },
], { loop: false });

const hit_launch = new Animation('hit_launch', [
    {
        pose: P({
            spine: -0.3,
            shoulderL: 0.4, shoulderR: -0.4,
            upperArmL: 0.6, upperArmR: -0.6,
            hipL: 0.1, hipR: -0.1,
            thighL: 0.2, thighR: -0.2,
        }),
        duration: 8,
    },
    {
        pose: P({
            spine: -0.1,
            shoulderL: 0.2, shoulderR: -0.2,
        }),
        duration: 7,
    },
], { loop: false });

// --- Registry ---
const animations = {
    idle,
    walk_forward,
    walk_backward,
    jump_rise,
    jump_float,
    jump_land,
    crouch,
    slide,
    wall_slide,
    dash_forward,
    fast_fall,

    // Attack animations
    punch_jab,
    punch_cross,
    punch_hook,
    punch_uppercut,
    kick_front,
    kick_high,
    kick_roundhouse,
    kick_sweep,
    kick_stomp,
    kick_dropkick,
    punch_air,
    kick_air,
    punch_dash,

    // Block animations
    block_stand,
    block_crouch,

    // Hit reactions
    hit_stagger,
    hit_launch,
};

export class AnimationLibrary {
    static get(name) {
        return animations[name] || null;
    }

    static has(name) {
        return name in animations;
    }
}
