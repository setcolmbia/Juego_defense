export type Quality = 'low' | 'medium' | 'high';

export interface GraphicsSettings {
  quality: Quality;
  shadows: boolean;
  bloom: boolean;
  ssao: boolean;
  particleDensity: number; // 0..1
}

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
}

export interface GameSettings {
  graphics: GraphicsSettings;
  audio: AudioSettings;
}

const STORAGE_KEY = 'ava_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  graphics: {
    quality: 'high',
    shadows: true,
    bloom: true,
    ssao: true,
    particleDensity: 1,
  },
  audio: {
    master: 0.8,
    music: 0.5,
    sfx: 0.8,
    muted: false,
  },
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    return {
      graphics: { ...DEFAULT_SETTINGS.graphics, ...parsed.graphics },
      audio: { ...DEFAULT_SETTINGS.audio, ...parsed.audio },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings: GameSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable, ignore */
  }
}
