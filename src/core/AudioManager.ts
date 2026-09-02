import type { AudioSettings } from './Settings';

/**
 * All sound in this game is synthesized at runtime via the Web Audio API —
 * there is no external asset pipeline, so every SFX/music cue is generated
 * procedurally (oscillators, noise buffers, envelopes) rather than sampled.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicStarted = false;
  private noiseBuffer: AudioBuffer | null = null;
  settings: AudioSettings;

  constructor(settings: AudioSettings) {
    this.settings = settings;
  }

  /** Must be called after a user gesture (browser autoplay policy). */
  ensureContext() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.applySettings(this.settings);

    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  applySettings(settings: AudioSettings) {
    this.settings = settings;
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.musicGain) return;
    const m = settings.muted ? 0 : settings.master;
    this.masterGain.gain.setTargetAtTime(m, this.ctx.currentTime, 0.05);
    this.sfxGain.gain.setTargetAtTime(settings.sfx, this.ctx.currentTime, 0.05);
    this.musicGain.gain.setTargetAtTime(settings.music, this.ctx.currentTime, 0.05);
  }

  private env(gain: GainNode, attack: number, decay: number, peak = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay);
  }

  private tone(freq: number, type: OscillatorType, dur: number, opts: { attack?: number; freqEnd?: number; peak?: number } = {}) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.env(gain, opts.attack ?? 0.005, dur, opts.peak ?? 0.5);
    osc.start();
    osc.stop(this.ctx.currentTime + dur + 0.05);
  }

  private noiseHit(dur: number, filterFreq: number, peak = 0.4) {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    this.env(gain, 0.002, dur, peak);
    src.start();
    src.stop(this.ctx.currentTime + dur + 0.05);
  }

  playShoot(kind: 'spike' | 'peck' | 'roar' | 'zap' = 'spike') {
    this.ensureContext();
    if (kind === 'spike') this.tone(520, 'square', 0.12, { freqEnd: 200, peak: 0.3 });
    else if (kind === 'peck') this.tone(900, 'triangle', 0.08, { freqEnd: 600, peak: 0.25 });
    else if (kind === 'zap') { this.tone(1200, 'sawtooth', 0.15, { freqEnd: 300, peak: 0.25 }); this.noiseHit(0.08, 4000, 0.15); }
    else this.noiseHit(0.3, 300, 0.4);
  }

  playImpact() {
    this.ensureContext();
    this.noiseHit(0.15, 1200, 0.35);
    this.tone(150, 'sine', 0.1, { freqEnd: 60, peak: 0.3 });
  }

  playDeath() {
    this.ensureContext();
    this.tone(300, 'sawtooth', 0.4, { freqEnd: 40, peak: 0.35 });
    this.noiseHit(0.3, 600, 0.2);
  }

  playCollect() {
    this.ensureContext();
    this.tone(660, 'sine', 0.12, { freqEnd: 990, peak: 0.3 });
  }

  playPlace() {
    this.ensureContext();
    this.tone(220, 'triangle', 0.15, { freqEnd: 440, peak: 0.3 });
  }

  playDenied() {
    this.ensureContext();
    this.tone(150, 'square', 0.15, { peak: 0.2 });
  }

  playWaveStart() {
    this.ensureContext();
    this.tone(220, 'sawtooth', 0.5, { freqEnd: 440, peak: 0.25 });
    setTimeout(() => this.tone(440, 'sawtooth', 0.4, { freqEnd: 660, peak: 0.2 }), 150);
  }

  playVictory() {
    this.ensureContext();
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 'triangle', 0.5, { peak: 0.3 }), i * 120));
  }

  playDefeat() {
    this.ensureContext();
    [400, 320, 240, 160].forEach((f, i) => setTimeout(() => this.tone(f, 'sawtooth', 0.6, { peak: 0.25 }), i * 180));
  }

  startAmbientMusic() {
    this.ensureContext();
    if (this.musicStarted || !this.ctx || !this.musicGain) return;
    this.musicStarted = true;
    const ctx = this.ctx;

    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.18;
    drone.connect(droneGain);
    droneGain.connect(this.musicGain);
    drone.start();

    const pad = ctx.createOscillator();
    pad.type = 'triangle';
    pad.frequency.value = 110;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 400;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.08;
    pad.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(this.musicGain);
    pad.start();

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfo.start();
  }
}
