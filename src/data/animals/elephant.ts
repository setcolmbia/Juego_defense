import { buildCreature } from '../../render/CreatureBuilder';
import type { DefenderStats } from '../../entities/Defender';

/**
 * The siege engine: the biggest, most decorated unit on the field. Pale
 * blue-grey bulk under royal-blue barding, gold tusks, a plumed war helm and
 * a banner-flying howdah strapped to its back — the tallest silhouette the
 * player owns.
 */
export const Elephant: DefenderStats = {
  id: 'elephant',
  name: 'War Elephant',
  description: 'Máquina de asedio. Pisotón devastador que golpea a todos los enemigos cercanos.',
  icon: '🐘',
  cost: 165,
  cooldown: 10,
  maxHealth: 520,
  damage: 45,
  attackRate: 2.0,
  range: 1.1,
  aoeRadius: 1.5,
  projectileColor: 0xffd88a,
  scale: 1.3,
  attackSound: 'roar',
  buildModel: () =>
    buildCreature({
      bodyColor: 0x98a4bd,
      secondaryColor: 0x6d7a96,
      accentColor: 0xf6efd6,
      bellyColor: 0xb6c0d4,
      muzzleColor: 0x8b98b3,
      limbColor: 0x76839f,
      footColor: 0x505b74,
      earColor: 0x8895b1,
      eyeColor: 0x151820,
      bodyLength: 0.95,
      bodyRadius: 0.92,
      bodySquash: 1.0,
      legHeight: 0.72,
      legRadius: 0.32,
      legCount: 4,
      neckLength: 0.06,
      headRadius: 0.6,
      headScale: 1.12,
      snoutLength: 0.85,
      mouthStyle: 'trunk',
      earType: 'flap',
      earScale: 1.2,
      tailType: 'short',
      tailColor: 0x6d7a96,
      hornType: 'none',
      faceStyle: 'cartoon',
      eyeScale: 0.75,
      browColor: 0x5b6884,
      browAngle: 0.5,
      roughness: 0.78,
      accessories: [
        { type: 'combat-helmet', color: 0x2f5fa8, accent: 0xffcf4a, scale: 0.8, offset: [-0.08, 0.12, 0] },
        { type: 'tusks', color: 0xf6efd6, accent: 0xf6efd6, scale: 1.1 },
        { type: 'howdah', color: 0x2f5fa8, accent: 0xffcf4a, scale: 1.0 },
        { type: 'armor-skirt', color: 0x24488a, accent: 0xffcf4a, scale: 1.0 },
      ],
    }),
};
