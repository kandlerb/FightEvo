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
};

export class AnimationLibrary {
    static get(name) {
        return animations[name] || null;
    }

    static has(name) {
        return name in animations;
    }
}
