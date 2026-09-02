import { buildCreature } from '../../render/CreatureBuilder';
import type { DefenderStats } from '../../entities/Defender';

export const Eagle: DefenderStats = {
  id: 'eagle',
  name: 'Sky Eagle',
  description: 'Vuela y ataca a distancia. La única defensa fiable contra voladores.',
  icon: '🦅',
  cost: 85,
  cooldown: 7,
  maxHealth: 70,
  damage: 16,
  attackRate: 0.65,
  range: 7.5,
  antiAir: true,
  projectileColor: 0xcfe8ff,
  scale: 0.9,
  attackSound: 'peck',
  buildModel: () =>
    buildCreature({
      bodyColor: 0x5b4636,
      secondaryColor: 0x2c2119,
      accentColor: 0xf2c14e,
      eyeColor: 0xffd94e,
      bodyLength: 1.0,
      bodyRadius: 0.4,
      legHeight: 0.5,
      legRadius: 0.1,
      legCount: 2,
      neckLength: 0.28,
      headRadius: 0.3,
      snoutLength: 0.28,
      earType: 'none',
      tailType: 'fluffy',
      hasWings: true,
      hornType: 'none',
      roughness: 0.6,
    }),
};
