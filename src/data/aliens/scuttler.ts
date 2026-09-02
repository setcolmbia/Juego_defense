import { buildCreature } from '../../render/CreatureBuilder';
import type { AlienStats } from '../../entities/Alien';

export const Scuttler: AlienStats = {
  id: 'scuttler',
  name: 'Scuttler Drone',
  maxHealth: 60,
  damage: 8,
  attackRate: 0.8,
  speed: 0.62,
  scoreValue: 10,
  energyDropChance: 0.12,
  scale: 0.62,
  buildModel: () =>
    buildCreature({
      bodyColor: 0x3a2f52,
      secondaryColor: 0x231a3d,
      accentColor: 0x7dffb0,
      eyeColor: 0x0a0a0a,
      bodyLength: 1.1,
      bodyRadius: 0.4,
      legHeight: 0.55,
      legRadius: 0.1,
      legCount: 6,
      neckLength: 0.15,
      headRadius: 0.32,
      snoutLength: 0.15,
      earType: 'pointy',
      tailType: 'spiked',
      hornType: 'none',
      emissive: 0x7dffb0,
      emissiveIntensity: 0.45,
      roughness: 0.5,
      metalness: 0.3,
    }),
};
