import { buildCreature } from '../../render/CreatureBuilder';
import type { AlienStats } from '../../entities/Alien';

export const Reaper: AlienStats = {
  id: 'reaper',
  name: 'Void Reaper',
  maxHealth: 100,
  damage: 12,
  attackRate: 1.0,
  speed: 0.5,
  flying: true,
  scoreValue: 30,
  energyDropChance: 0.18,
  scale: 0.7,
  buildModel: () =>
    buildCreature({
      bodyColor: 0x2a1f45,
      secondaryColor: 0x1a1330,
      accentColor: 0xc86bff,
      eyeColor: 0x0a0a0a,
      bodyLength: 1.3,
      bodyRadius: 0.32,
      legHeight: 0.4,
      legRadius: 0.08,
      legCount: 2,
      neckLength: 0.2,
      headRadius: 0.3,
      snoutLength: 0.2,
      earType: 'none',
      tailType: 'long',
      hasWings: true,
      hornType: 'single',
      emissive: 0xc86bff,
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.35,
    }),
};
