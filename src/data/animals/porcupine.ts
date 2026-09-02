import { buildCreature } from '../../render/CreatureBuilder';
import type { DefenderStats } from '../../entities/Defender';

export const Porcupine: DefenderStats = {
  id: 'porcupine',
  name: 'Quill Porcupine',
  description: 'Dispara púas a distancia. Versátil y económico.',
  icon: '🦔',
  cost: 50,
  cooldown: 4,
  maxHealth: 90,
  damage: 12,
  attackRate: 0.9,
  range: 7,
  projectileColor: 0xffcf6b,
  scale: 0.85,
  attackSound: 'spike',
  buildModel: () =>
    buildCreature({
      bodyColor: 0x6b5a3f,
      secondaryColor: 0x3f3324,
      accentColor: 0xffcf6b,
      eyeColor: 0x1a1a1a,
      bodyLength: 1.3,
      bodyRadius: 0.5,
      legHeight: 0.45,
      legRadius: 0.13,
      legCount: 4,
      neckLength: 0.12,
      headRadius: 0.36,
      snoutLength: 0.22,
      earType: 'round',
      tailType: 'short',
      hornType: 'none',
      spikeCount: 9,
      roughness: 0.8,
    }),
};
