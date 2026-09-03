import { buildCreature } from '../../render/CreatureBuilder';
import type { DefenderStats } from '../../entities/Defender';

/**
 * The ace pilot of the militia: an upright rust-and-cream raptor in leather
 * flight goggles and a red squadron scarf, with a broad two-tone wingspan and
 * a gold hooked beak. The only winged silhouette on the board.
 */
export const Eagle: DefenderStats = {
  id: 'eagle',
  name: 'Sky Eagle',
  description: 'As de la escuadrilla. Ataca a distancia y derriba voladores.',
  icon: '🦅',
  cost: 85,
  cooldown: 7,
  maxHealth: 70,
  damage: 16,
  attackRate: 0.65,
  range: 7.5,
  antiAir: true,
  projectileColor: 0xcfe8ff,
  scale: 0.95,
  attackSound: 'peck',
  buildModel: () =>
    buildCreature({
      stance: 'biped',
      bodyColor: 0xa1461f,
      secondaryColor: 0x62290f,
      accentColor: 0xffb524,
      headColor: 0xf7f1e2,
      bellyColor: 0xc4632c,
      limbColor: 0xffb524,
      footColor: 0xf0980e,
      eyeColor: 0x1b1206,
      bodyLength: 0.8,
      bodyRadius: 0.34,
      bodySquash: 1.02,
      legHeight: 0.44,
      legRadius: 0.1,
      legCount: 2,
      neckLength: 0.05,
      headRadius: 0.31,
      headScale: 1.32,
      snoutLength: 0.22,
      earType: 'none',
      tailType: 'fluffy',
      tailColor: 0x62290f,
      hasWings: true,
      wingColor: 0x3d1c0a,
      wingAltColor: 0x7d3312,
      wingTipColor: 0xffc24a,
      hornType: 'none',
      faceStyle: 'cartoon',
      eyeScale: 1.0,
      eyeWhiteColor: 0xfffaf0,
      browColor: 0xd8b070,
      browAngle: 0.6,
      mouthStyle: 'beak',
      roughness: 0.65,
      accessories: [
        { type: 'goggles', color: 0x53381e, accent: 0x7fd8ff, scale: 1.05 },
        { type: 'scarf', color: 0xe0342c, accent: 0xffd24a, scale: 0.95 },
      ],
    }),
};
