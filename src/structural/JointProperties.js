/**
 * Structural properties for each joint (connection between parent and child bone).
 * Joints can dislocate when stressed, causing the child bone and all descendants
 * to go ragdoll.
 *
 * strength:      Force resistance. Higher = harder to damage.
 * dislocateHP:   Structural HP before the joint gives out.
 * flexibility:   Normal rotation range (radians).
 * criticalAngle: If forced beyond this, instant bonus damage.
 */
export const JOINT_PROPERTIES = {
    // key: "parentBone_childBone"
    'neck_head':            { strength: 0.8, dislocateHP: 20, flexibility: 0.8, criticalAngle: 1.5 },
    'spine_neck':           { strength: 1.0, dislocateHP: 25, flexibility: 1.0, criticalAngle: 2.0 },
    'spine_shoulderL':      { strength: 1.2, dislocateHP: 30, flexibility: 2.5, criticalAngle: 3.2 },
    'spine_shoulderR':      { strength: 1.2, dislocateHP: 30, flexibility: 2.5, criticalAngle: 3.2 },
    'shoulderL_upperArmL':  { strength: 1.1, dislocateHP: 28, flexibility: 2.5, criticalAngle: 3.2 },
    'shoulderR_upperArmR':  { strength: 1.1, dislocateHP: 28, flexibility: 2.5, criticalAngle: 3.2 },
    'upperArmL_forearmL':   { strength: 1.0, dislocateHP: 25, flexibility: 2.8, criticalAngle: 3.5 },
    'upperArmR_forearmR':   { strength: 1.0, dislocateHP: 25, flexibility: 2.8, criticalAngle: 3.5 },
    'forearmL_handL':       { strength: 0.8, dislocateHP: 15, flexibility: 1.5, criticalAngle: 2.0 },
    'forearmR_handR':       { strength: 0.8, dislocateHP: 15, flexibility: 1.5, criticalAngle: 2.0 },
    'hip_hipL':             { strength: 1.5, dislocateHP: 40, flexibility: 2.0, criticalAngle: 2.8 },
    'hip_hipR':             { strength: 1.5, dislocateHP: 40, flexibility: 2.0, criticalAngle: 2.8 },
    'hipL_thighL':          { strength: 1.5, dislocateHP: 40, flexibility: 2.0, criticalAngle: 2.8 },
    'hipR_thighR':          { strength: 1.5, dislocateHP: 40, flexibility: 2.0, criticalAngle: 2.8 },
    'thighL_shinL':         { strength: 1.0, dislocateHP: 25, flexibility: 2.5, criticalAngle: 3.0 },
    'thighR_shinR':         { strength: 1.0, dislocateHP: 25, flexibility: 2.5, criticalAngle: 3.0 },
    'shinL_footL':          { strength: 0.8, dislocateHP: 15, flexibility: 1.2, criticalAngle: 1.8 },
    'shinR_footR':          { strength: 0.8, dislocateHP: 15, flexibility: 1.2, criticalAngle: 1.8 },
    'hip_spine':            { strength: 1.8, dislocateHP: 50, flexibility: 1.5, criticalAngle: 2.5 },
};
