import { buildCreature } from '../../render/CreatureBuilder';
import type { DefenderStats } from '../../entities/Defender';

export const Rhino: DefenderStats = {
  id: 'rhino',
  name: 'Rhino Vanguard',
  description: 'Muro viviente. Mucha vida, golpea cuerpo a cuerpo.',
  icon: '🦏',
  cost: 100,
  cooldown: 6,
  maxHealth: 340,
  damage: 26,
  attackRate: 1.1,
  range: 1.05,
  projectileColor: 0xffffff,
  scale: 1.05,
  attackSound: 'roar',
  buildModel: () =>
    buildCreature({
      bodyColor: 0x8a8a86,
      secondaryColor: 0x5c5c58,
      accentColor: 0xe8e0c8,
      eyeColor: 0x1a1a1a,
      bodyLength: 1.9,
      bodyRadius: 0.72,
      legHeight: 0.72,
      legRadius: 0.22,
      legCount: 4,
      neckLength: 0.2,
      headRadius: 0.5,
      snoutLength: 0.4,
      earType: 'round',
      tailType: 'short',
      hornType: 'single',
      armored: true,
      roughness: 0.7,
    }),
};
