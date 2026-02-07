import { CONFIG } from '../config.js';

/**
 * Sound hook infrastructure for future audio.
 * Provides a clean API for playing sounds without requiring actual audio files.
 * When audio files are added, just populate the soundBank.
 *
 * Usage: AudioManager.play('hit_impact', { volume: 0.8, pitch: 1.2 })
 */
export class AudioManager {
    constructor() {
        this.ctx = null; // AudioContext, created on first user interaction
        this.masterVolume = CONFIG.MASTER_VOLUME || 1.0;
        this.effectsVolume = CONFIG.EFFECTS_VOLUME || 0.8;
        this.enabled = true;
        this.initialized = false;

        // Sound bank: soundKey → AudioBuffer (populated when audio files are added)
        this.soundBank = {};
    }

    /**
     * Initialize AudioContext (must be called after user interaction).
     */
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            // Browser doesn't support Web Audio — audio disabled silently
            this.enabled = false;
        }
    }

    /**
     * Play a sound by key. No-op if sound isn't loaded yet.
     * @param {string} key - sound identifier (e.g., 'hit_impact', 'bone_break')
     * @param {object} opts - { volume, pitch, pan }
     */
    play(key, opts = {}) {
        if (!this.enabled || !this.initialized || !this.ctx) return;

        const buffer = this.soundBank[key];
        if (!buffer) return; // Sound not loaded — silent no-op

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = opts.pitch || 1.0;

        const gain = this.ctx.createGain();
        gain.gain.value = (opts.volume || 1.0) * this.effectsVolume * this.masterVolume;

        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
    }

    /**
     * Generate a simple procedural blip for feedback (no audio files needed).
     * Uses oscillator for basic hit/impact sounds.
     */
    playTone(frequency, duration, opts = {}) {
        if (!this.enabled || !this.initialized || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = opts.type || 'square';
        osc.frequency.value = frequency;

        const vol = (opts.volume || 0.15) * this.effectsVolume * this.masterVolume;
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    // ─── Sound hook methods (called from game systems) ──────

    /** Hit impact — varies pitch by damage */
    hitImpact(damage) {
        const pitch = 200 + Math.min(damage, 30) * 10;
        this.playTone(pitch, 0.08, { volume: 0.12, type: 'square' });
    }

    /** Block sound */
    blockImpact() {
        this.playTone(300, 0.05, { volume: 0.08, type: 'triangle' });
    }

    /** Bone break — low crunch */
    boneBreak() {
        this.playTone(80, 0.15, { volume: 0.15, type: 'sawtooth' });
    }

    /** Joint pop */
    jointPop() {
        this.playTone(150, 0.06, { volume: 0.1, type: 'square' });
    }

    /** Landing thud */
    land() {
        this.playTone(60, 0.06, { volume: 0.06, type: 'sine' });
    }

    /** Dash whoosh */
    dash() {
        this.playTone(400, 0.1, { volume: 0.05, type: 'sine' });
    }

    /** Explosion */
    explosion() {
        this.playTone(50, 0.3, { volume: 0.2, type: 'sawtooth' });
    }

    /** Boss intro stinger */
    bossIntro() {
        this.playTone(120, 0.4, { volume: 0.15, type: 'sawtooth' });
        setTimeout(() => this.playTone(80, 0.5, { volume: 0.18, type: 'sawtooth' }), 200);
    }

    /** Boss defeat fanfare */
    bossDefeat() {
        this.playTone(400, 0.15, { volume: 0.12, type: 'square' });
        setTimeout(() => this.playTone(500, 0.15, { volume: 0.12, type: 'square' }), 100);
        setTimeout(() => this.playTone(600, 0.3, { volume: 0.15, type: 'square' }), 200);
    }

    /** Wave advance chime */
    waveAdvance() {
        this.playTone(500, 0.1, { volume: 0.08, type: 'triangle' });
        setTimeout(() => this.playTone(600, 0.15, { volume: 0.1, type: 'triangle' }), 80);
    }

    /** Enemy death */
    enemyDeath() {
        this.playTone(100, 0.12, { volume: 0.1, type: 'sawtooth' });
    }

    /** Game over */
    gameOver() {
        this.playTone(200, 0.2, { volume: 0.15, type: 'square' });
        setTimeout(() => this.playTone(150, 0.3, { volume: 0.12, type: 'square' }), 200);
        setTimeout(() => this.playTone(80, 0.5, { volume: 0.15, type: 'sawtooth' }), 400);
    }

    setMasterVolume(v) {
        this.masterVolume = Math.max(0, Math.min(1, v));
    }

    setEffectsVolume(v) {
        this.effectsVolume = Math.max(0, Math.min(1, v));
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}
