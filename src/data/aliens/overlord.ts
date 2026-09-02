import { buildCreature } from '../../render/CreatureBuilder';
import type { AlienStats } from '../../entities/Alien';

export const Overlord: AlienStats = {
  id: 'overlord',
  name: 'Overlord Crusher',
  maxHealth: 520,
  damage: 42,
  attackRate: 1.8,
  speed: 0.24,
  boss: true,
  scoreValue: 200,
  energyDropChance: 0.1,
  scale: 1.5,
  buildModel: () =>
    buildCreature({
      bodyColor: 0x3d1f4a,
      secondaryColor: 0x24132b,
      accentColor: 0xff2e6b,
      eyeColor: 0x0a0a0a,
      bodyLength: 2.1,
      bodyRadius: 0.85,
      legHeight: 0.8,
      legRadius: 0.24,
      legCount: 4,
      neckLength: 0.3,
      headRadius: 0.56,
      snoutLength: 0.34,
      earType: 'none',
      tailType: 'spiked',
      hornType: 'antlers',
      armored: true,
      spikeCount: 5,
      emissive: 0xff2e6b,
      emissiveIntensity: 0.85,
      roughness: 0.5,
      metalness: 0.5,
    }),
};
