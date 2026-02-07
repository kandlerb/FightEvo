import { CONFIG } from '../config.js';

/**
 * Reads game state and produces 28 normalized inputs for the NEAT neural network.
 *
 * Inputs 0-19:  Environmental awareness
 * Inputs 20-27: Structural awareness (injury state)
 *
 * All values normalized to [-1, 1] or [0, 1].
 */
export class SensorArray {
    /**
     * @param {Fighter} self - the AI-controlled enemy
     * @param {Fighter} player - the player fighter
     * @param {Fighter[]} allEnemies - all living enemies (for ally awareness)
     * @returns {Float64Array} 28 normalized sensor values
     */
    static read(self, player, allEnemies) {
        const inputs = new Float64Array(28);

        const arenaW = CONFIG.ARENA_WIDTH;
        const arenaH = CONFIG.ARENA_HEIGHT;
        const maxDist = Math.sqrt(arenaW * arenaW + arenaH * arenaH);
        const maxSpeed = 15; // reasonable velocity cap for normalization

        // 0: own_hp_normalized [0, 1]
        inputs[0] = self.hp / self.maxHp;

        // 1: own_facing_direction [-1, +1]
        inputs[1] = self.facingDirection;

        // 2: player_hp_normalized [0, 1]
        inputs[2] = player.hp / player.maxHp;

        // 3: player_distance_x [-1, 1] (positive = player is to the right)
        inputs[3] = clamp((player.x - self.x) / arenaW, -1, 1);

        // 4: player_distance_y [-1, 1] (negative = player is above)
        inputs[4] = clamp((player.y - self.y) / arenaH, -1, 1);

        // 5: player_velocity_x [-1, 1]
        inputs[5] = clamp(player.body.velocity.x / maxSpeed, -1, 1);

        // 6: player_velocity_y [-1, 1]
        inputs[6] = clamp(player.body.velocity.y / maxSpeed, -1, 1);

        // 7: player_grounded [0, 1]
        inputs[7] = player.isGrounded ? 1 : 0;

        // 8: player_state_attacking [0, 1]
        inputs[8] = (player.combat && player.combat.comboSystem.currentMove) ? 1 : 0;

        // 9: player_state_blocking [0, 1]
        inputs[9] = player.isBlocking ? 1 : 0;

        // 10: player_state_hitstun [0, 1]
        inputs[10] = (player.combat && player.combat.hitstunFrames > 0) ? 1 : 0;

        // 11: player_facing_direction [-1, +1]
        inputs[11] = player.facingDirection;

        // 12: own_velocity_x [-1, 1]
        inputs[12] = clamp(self.body.velocity.x / maxSpeed, -1, 1);

        // 13: own_velocity_y [-1, 1]
        inputs[13] = clamp(self.body.velocity.y / maxSpeed, -1, 1);

        // 14: own_grounded [0, 1]
        inputs[14] = self.isGrounded ? 1 : 0;

        // 15: own_state_encoded [0, 1]
        //   idle=0, attacking=0.33, hitstun=0.66, blocking=1.0
        inputs[15] = SensorArray._encodeState(self);

        // 16: near_left_wall [0, 1] (1.0 = touching)
        inputs[16] = clamp(1 - (self.x - CONFIG.WALL_THICKNESS) / (arenaW * 0.2), 0, 1);

        // 17: near_right_wall [0, 1] (1.0 = touching)
        inputs[17] = clamp(1 - (arenaW - CONFIG.WALL_THICKNESS - self.x) / (arenaW * 0.2), 0, 1);

        // 18-19: nearest_ally_distance (for flanking)
        const ally = SensorArray._findNearestAlly(self, allEnemies);
        if (ally) {
            inputs[18] = clamp((ally.x - self.x) / arenaW, -1, 1);
            inputs[19] = clamp((ally.y - self.y) / arenaH, -1, 1);
        } else {
            inputs[18] = 0;
            inputs[19] = 0;
        }

        // === Structural awareness (20-27) ===

        const structural = self.structural;
        if (structural) {
            // 20: left_leg_integrity [0, 1]
            inputs[20] = SensorArray._limbIntegrity(structural, ['thighL', 'shinL', 'footL']);

            // 21: right_leg_integrity [0, 1]
            inputs[21] = SensorArray._limbIntegrity(structural, ['thighR', 'shinR', 'footR']);

            // 22: left_arm_integrity [0, 1]
            inputs[22] = SensorArray._limbIntegrity(structural, ['upperArmL', 'forearmL', 'handL']);

            // 23: right_arm_integrity [0, 1]
            inputs[23] = SensorArray._limbIntegrity(structural, ['upperArmR', 'forearmR', 'handR']);

            // 24: spine_integrity [0, 1]
            inputs[24] = structural.getBoneHPRatio('spine');

            // 25: can_walk [0, 1]
            inputs[25] = self.speedMult > 0.3 ? 1 : 0;

            // 26: can_jump [0, 1]
            inputs[26] = self.jumpMult > 0 ? 1 : 0;

            // 27: available_attacks_ratio [0, 1]
            inputs[27] = SensorArray._availableAttacksRatio(structural);
        } else {
            // No structural system, assume fully healthy
            for (let i = 20; i < 28; i++) inputs[i] = 1;
        }

        return inputs;
    }

    static _encodeState(fighter) {
        if (fighter.combat && fighter.combat.hitstunFrames > 0) return 0.66;
        if (fighter.isBlocking) return 1.0;
        if (fighter.combat && fighter.combat.comboSystem.currentMove) return 0.33;
        return 0;
    }

    static _findNearestAlly(self, allEnemies) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const enemy of allEnemies) {
            if (enemy === self) continue;
            if (enemy.hp <= 0) continue;
            const dx = enemy.x - self.x;
            const dy = enemy.y - self.y;
            const dist = dx * dx + dy * dy;
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }
        return nearest;
    }

    static _limbIntegrity(structural, boneNames) {
        let total = 0;
        for (const name of boneNames) {
            total += structural.getBoneHPRatio(name);
        }
        return total / boneNames.length;
    }

    static _availableAttacksRatio(structural) {
        // Check if arms/legs are functional enough to attack
        const armState = structural.getArmDamageState();
        const legState = structural.getLegDamageState();

        let available = 0;
        const total = 4; // punch, kick, crouch attacks, air attacks

        if (armState !== 'NO_ARMS') available += 1; // punches
        if (legState !== 'NO_LEGS') available += 1; // kicks
        if (legState !== 'NO_LEGS' && armState !== 'NO_ARMS') available += 1; // crouch attacks
        if (legState !== 'NO_LEGS') available += 1; // air attacks

        return available / total;
    }
}

function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
}
