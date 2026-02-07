/**
 * Structural properties for each bone. Determines how bones take
 * structural damage and break.
 *
 * density:   Mass per unit length. Higher = harder to break.
 * structHP:  Total structural HP before the bone breaks.
 * thickness: Visual width AND physics factor.
 * hardness:  Damage reduction on the bone (0-1, armor-like).
 */
export const BONE_PROPERTIES = {
    head:       { density: 1.2, structHP: 40, thickness: 1.0, hardness: 0.3 },
    neck:       { density: 0.8, structHP: 25, thickness: 0.7, hardness: 0.0 },
    spine:      { density: 1.5, structHP: 80, thickness: 1.2, hardness: 0.2 },
    shoulderL:  { density: 1.0, structHP: 30, thickness: 0.8, hardness: 0.1 },
    shoulderR:  { density: 1.0, structHP: 30, thickness: 0.8, hardness: 0.1 },
    upperArmL:  { density: 1.0, structHP: 35, thickness: 0.8, hardness: 0.1 },
    upperArmR:  { density: 1.0, structHP: 35, thickness: 0.8, hardness: 0.1 },
    forearmL:   { density: 0.9, structHP: 30, thickness: 0.7, hardness: 0.1 },
    forearmR:   { density: 0.9, structHP: 30, thickness: 0.7, hardness: 0.1 },
    handL:      { density: 0.7, structHP: 15, thickness: 0.5, hardness: 0.05 },
    handR:      { density: 0.7, structHP: 15, thickness: 0.5, hardness: 0.05 },
    hipL:       { density: 1.3, structHP: 45, thickness: 1.0, hardness: 0.15 },
    hipR:       { density: 1.3, structHP: 45, thickness: 1.0, hardness: 0.15 },
    thighL:     { density: 1.3, structHP: 50, thickness: 1.0, hardness: 0.15 },
    thighR:     { density: 1.3, structHP: 50, thickness: 1.0, hardness: 0.15 },
    shinL:      { density: 1.1, structHP: 40, thickness: 0.9, hardness: 0.1 },
    shinR:      { density: 1.1, structHP: 40, thickness: 0.9, hardness: 0.1 },
    footL:      { density: 0.8, structHP: 20, thickness: 0.6, hardness: 0.05 },
    footR:      { density: 0.8, structHP: 20, thickness: 0.6, hardness: 0.05 },
};
