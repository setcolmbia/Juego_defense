import { getAlien } from '../data/AlienRegistry';
import type { CombatSystem } from './CombatSystem';
import { ROWS } from '../world/GridConfig';

export interface WaveEvent {
  alienId: string;
  row?: number;
  delay: number; // seconds after previous event (or wave start for the first)
}

export interface WaveDefinition {
  label: string;
  events: WaveEvent[];
  intermission: number; // seconds of calm before this wave starts
}

export type SpawnPhase = 'intermission' | 'spawning' | 'clearing' | 'done';

export class SpawnManager {
  waveIndex = -1;
  phase: SpawnPhase = 'intermission';
  private timer = 0;
  private eventCursor = 0;
  onWaveStart: ((index: number, label: string) => void) | null = null;
  onWaveClear: ((index: number) => void) | null = null;
  onAllWavesClear: (() => void) | null = null;
  onIntermissionTick: ((secondsLeft: number) => void) | null = null;

  constructor(
    private waves: WaveDefinition[],
    private combat: CombatSystem,
  ) {
    this.timer = waves[0]?.intermission ?? 3;
  }

  get currentWave(): WaveDefinition | null {
    return this.waves[this.waveIndex] ?? null;
  }

  get totalWaves() {
    return this.waves.length;
  }

  update(dt: number) {
    if (this.phase === 'done') return;

    if (this.phase === 'intermission') {
      this.timer -= dt;
      this.onIntermissionTick?.(Math.max(0, this.timer));
      if (this.timer <= 0) {
        this.waveIndex++;
        const wave = this.waves[this.waveIndex];
        if (!wave) {
          this.phase = 'done';
          this.onAllWavesClear?.();
          return;
        }
        this.phase = 'spawning';
        this.eventCursor = 0;
        this.timer = wave.events[0]?.delay ?? 0;
        this.onWaveStart?.(this.waveIndex, wave.label);
      }
      return;
    }

    if (this.phase === 'spawning') {
      const wave = this.currentWave!;
      this.timer -= dt;
      while (this.timer <= 0 && this.eventCursor < wave.events.length) {
        const ev = wave.events[this.eventCursor];
        const row = ev.row ?? Math.floor(Math.random() * ROWS);
        this.combat.spawnAlien(getAlien(ev.alienId), row, Math.random() * 1.2);
        this.eventCursor++;
        const next = wave.events[this.eventCursor];
        this.timer += next ? next.delay : 0;
        if (!next) break;
      }
      if (this.eventCursor >= wave.events.length) {
        this.phase = 'clearing';
      }
      return;
    }

    if (this.phase === 'clearing') {
      if (this.combat.aliens.length === 0) {
        this.onWaveClear?.(this.waveIndex);
        const next = this.waves[this.waveIndex + 1];
        this.timer = next?.intermission ?? 5;
        this.phase = 'intermission';
      }
    }
  }
}
