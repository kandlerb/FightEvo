/**
 * Accumulates fitness in real-time for a single enemy lifecycle.
 *
 * Fitness formula from TECHNICAL_SPEC.md:
 *   + damage_dealt * 3.0
 *   + combo_hits * 5.0
 *   - damage_taken * 1.0
 *   + survival_time * 0.5
 *   + distance_closed * 0.2
 *   - idle_frames * 0.1
 *   + successful_blocks * 2.0
 *   + kill_bonus * 50.0
 *
 * Final: raw_fitness / max(survival_seconds, 3)
 */
export class FitnessEvaluator {
    constructor() {
        this.damageDealt = 0;
        this.comboHits = 0;
        this.damageTaken = 0;
        this.survivalFrames = 0;
        this.distanceClosed = 0;
        this.idleFrames = 0;
        this.successfulBlocks = 0;
        this.killedPlayer = false;

        this._prevHP = -1;
        this._prevPlayerHP = -1;
        this._prevDist = -1;
    }

    /**
     * Called each frame to accumulate fitness data.
     */
    update(self, player) {
        this.survivalFrames++;

        // Track damage dealt to player
        if (this._prevPlayerHP >= 0) {
            const dmg = this._prevPlayerHP - player.hp;
            if (dmg > 0) this.damageDealt += dmg;
        }
        this._prevPlayerHP = player.hp;

        // Track damage taken
        if (this._prevHP >= 0) {
            const dmg = this._prevHP - self.hp;
            if (dmg > 0) this.damageTaken += dmg;
        }
        this._prevHP = self.hp;

        // Track combo hits (from combo counter)
        if (self.combat && self.combat.comboSystem) {
            this.comboHits = Math.max(this.comboHits, self.combat.comboSystem.comboCount || 0);
        }

        // Track distance closing (reward approaching the player)
        const dist = Math.abs(player.x - self.x);
        if (this._prevDist >= 0) {
            const closed = this._prevDist - dist;
            if (closed > 0) this.distanceClosed += closed;
        }
        this._prevDist = dist;

        // Track idle frames (no velocity, not attacking, not blocking)
        const isIdle = Math.abs(self.body.velocity.x) < 0.3 &&
                       Math.abs(self.body.velocity.y) < 0.3 &&
                       !(self.combat && self.combat.comboSystem.currentMove) &&
                       !self.isBlocking;
        if (isIdle) this.idleFrames++;

        // Track blocking
        if (self.isBlocking && self.combat && self.combat.hitstunFrames === 0) {
            // Count as a "successful" block if the player is attacking nearby
            if (player.combat && player.combat.comboSystem.currentMove) {
                const closeDist = Math.abs(player.x - self.x) < 80;
                if (closeDist) this.successfulBlocks += 0.05; // fractional per frame
            }
        }

        // Check for kill
        if (player.hp <= 0) this.killedPlayer = true;
    }

    /**
     * Calculate final fitness score.
     */
    finalize() {
        const raw =
            (this.damageDealt * 3.0) +
            (this.comboHits * 5.0) -
            (this.damageTaken * 1.0) +
            ((this.survivalFrames / 60) * 0.5) +
            (this.distanceClosed * 0.002) -
            (this.idleFrames * 0.1) +
            (this.successfulBlocks * 2.0) +
            (this.killedPlayer ? 50.0 : 0);

        // Normalize by survival time (reward efficiency)
        const survivalSeconds = Math.max(this.survivalFrames / 60, 3);
        return Math.max(0, raw / survivalSeconds);
    }
}
