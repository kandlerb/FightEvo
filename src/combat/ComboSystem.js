import { CONFIG } from '../config.js';
import { MOVES, COMBO_CHAINS } from './MoveSet.js';

/**
 * Input buffer and combo resolution. Tracks recent attack inputs
 * and resolves them into moves based on fighter state and combo chains.
 */
export class ComboSystem {
    constructor(fighter) {
        this.fighter = fighter;
        this.buffer = [];
        this.currentMove = null;
        this.currentFrame = 0;
        this.comboCount = 0;
        this.chainWindow = 0;
        this.hitConfirmed = false;
    }

    /**
     * Buffer an attack input.
     * @param {'punch'|'kick'} action
     * @param {string} direction - 'forward','back','up','down','neutral'
     */
    bufferInput(action, direction) {
        this.buffer.push({
            action,
            direction,
            timestamp: performance.now(),
        });

        if (this.buffer.length > CONFIG.COMBO_BUFFER_SIZE) {
            this.buffer.shift();
        }
    }

    /**
     * Called each frame. Advances the current move's frame counter
     * and handles state transitions.
     * @returns {{state: string, move: object|null, frame: number}}
     */
    update() {
        this._pruneBuffer();

        // If currently in an attack
        if (this.currentMove) {
            this.currentFrame++;
            const move = this.currentMove;
            const totalFrames = move.startup + move.active + move.recovery;

            // Check for combo chain during recovery
            if (this.currentFrame > move.startup + move.active) {
                if (this.chainWindow > 0) {
                    this.chainWindow--;
                    const nextMove = this._resolveChain();
                    if (nextMove) {
                        return this._startMove(nextMove);
                    }
                }
            }

            // Hit cancel: shorten recovery if hit confirmed
            let adjustedTotal = totalFrames;
            if (this.hitConfirmed) {
                adjustedTotal -= CONFIG.HIT_CANCEL_WINDOW;
            }

            // Move finished
            if (this.currentFrame >= adjustedTotal) {
                this.currentMove = null;
                this.currentFrame = 0;
                return { state: 'idle', move: null, frame: 0 };
            }

            return {
                state: 'attacking',
                move: this.currentMove,
                frame: this.currentFrame,
            };
        }

        // No current move — try to resolve a new one from buffer
        const move = this._resolveFromBuffer();
        if (move) {
            return this._startMove(move);
        }

        return { state: 'idle', move: null, frame: 0 };
    }

    _startMove(move) {
        this.currentMove = move;
        this.currentFrame = 0;
        this.hitConfirmed = false;
        this.chainWindow = CONFIG.COMBO_CHAIN_WINDOW;
        this.comboCount++;
        return { state: 'attacking', move, frame: 0 };
    }

    /**
     * Called when the current attack hits something.
     */
    confirmHit() {
        this.hitConfirmed = true;
        this.chainWindow = CONFIG.COMBO_CHAIN_WINDOW;
    }

    /**
     * Reset combo state (e.g., when fighter gets hit).
     */
    reset() {
        this.currentMove = null;
        this.currentFrame = 0;
        this.comboCount = 0;
        this.chainWindow = 0;
        this.hitConfirmed = false;
        this.buffer = [];
    }

    isInStartup() {
        return this.currentMove && this.currentFrame < this.currentMove.startup;
    }

    isInActive() {
        if (!this.currentMove) return false;
        return this.currentFrame >= this.currentMove.startup &&
               this.currentFrame < this.currentMove.startup + this.currentMove.active;
    }

    isInRecovery() {
        if (!this.currentMove) return false;
        return this.currentFrame >= this.currentMove.startup + this.currentMove.active;
    }

    _pruneBuffer() {
        const now = performance.now();
        this.buffer = this.buffer.filter(
            input => now - input.timestamp < CONFIG.COMBO_BUFFER_WINDOW
        );
    }

    _resolveChain() {
        if (this.buffer.length === 0) return null;
        const input = this.buffer[0];
        const key = `${this.currentMove.name}+${input.action}`;
        const chainName = COMBO_CHAINS[key];
        if (chainName && MOVES[chainName]) {
            this.buffer.shift();
            return MOVES[chainName];
        }
        return null;
    }

    _resolveFromBuffer() {
        if (this.buffer.length === 0) return null;

        const input = this.buffer.shift();
        const f = this.fighter;

        // Contextual move resolution based on fighter state
        if (f.isCrouching) {
            if (input.action === 'punch') return MOVES.uppercut;
            if (input.action === 'kick') return MOVES.sweep;
        }

        if (f.movement && f.movement.dashFrames > 0) {
            if (input.action === 'punch') return MOVES.dash_punch;
            if (input.action === 'kick') return MOVES.dropkick;
        }

        if (!f.isGrounded) {
            if (input.action === 'punch') return MOVES.air_jab;
            if (input.action === 'kick') {
                if (input.direction === 'down') return MOVES.stomp;
                return MOVES.air_kick;
            }
        }

        // Standing
        if (input.action === 'punch') return MOVES.jab;
        if (input.action === 'kick') return MOVES.front_kick;

        return null;
    }

    /**
     * Get combo damage scale for the current hit number.
     */
    getDamageScale() {
        const idx = Math.min(this.comboCount - 1, CONFIG.COMBO_SCALE.length - 1);
        return CONFIG.COMBO_SCALE[Math.max(0, idx)];
    }
}
