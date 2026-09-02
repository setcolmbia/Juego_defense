import { buildCreature } from '../../render/CreatureBuilder';
import type { AlienStats } from '../../entities/Alien';

export const Brute: AlienStats = {
  id: 'brute',
  name: 'Brute Trooper',
  maxHealth: 160,
  damage: 18,
  attackRate: 1.2,
  speed: 0.34,
  scoreValue: 25,
  energyDropChance: 0.2,
  scale: 0.92,
  buildModel: () =>
    buildCreature({
      bodyColor: 0x4a3a66,
      secondaryColor: 0x2b2140,
      accentColor: 0xbf5cff,
      eyeColor: 0x0a0a0a,
      bodyLength: 1.6,
      bodyRadius: 0.6,
      legHeight: 0.68,
      legRadius: 0.18,
      legCount: 4,
      neckLength: 0.22,
      headRadius: 0.44,
      snoutLength: 0.28,
      earType: 'none',
      tailType: 'none',
      hornType: 'double',
      armored: true,
      emissive: 0xbf5cff,
      emissiveIntensity: 0.5,
      roughness: 0.55,
      metalness: 0.4,
    }),
};
