import { buildCreature } from '../../render/CreatureBuilder';
import type { AlienStats } from '../../entities/Alien';

export const Hunter: AlienStats = {
  id: 'hunter',
  name: 'Spore Hunter',
  maxHealth: 85,
  damage: 24,
  attackRate: 1.6,
  speed: 0.58,
  scoreValue: 22,
  energyDropChance: 0.15,
  scale: 0.78,
  buildModel: () =>
    buildCreature({
      bodyColor: 0x1f4a3d,
      secondaryColor: 0x123028,
      accentColor: 0xff7a2e,
      eyeColor: 0x0a0a0a,
      bodyLength: 1.2,
      bodyRadius: 0.42,
      legHeight: 0.62,
      legRadius: 0.13,
      legCount: 2,
      neckLength: 0.18,
      headRadius: 0.36,
      snoutLength: 0.32,
      earType: 'pointy',
      tailType: 'fluffy',
      hornType: 'crest',
      emissive: 0xff7a2e,
      emissiveIntensity: 0.55,
      roughness: 0.45,
      metalness: 0.25,
    }),
};
