import { buildCreature } from '../../render/CreatureBuilder';
import type { DefenderStats } from '../../entities/Defender';

/**
 * The armored bruiser: a slate-blue tank of an animal buried under crimson
 * plate — crested helmet, shoulder guards, spine plating and a cream horn.
 * Red is its signature: nothing else on the board is red-on-blue.
 */
export const Rhino: DefenderStats = {
  id: 'rhino',
  name: 'Rhino Vanguard',
  description: 'Muro acorazado. Aguanta el frente y golpea cuerpo a cuerpo.',
  icon: '🦏',
  cost: 100,
  cooldown: 6,
  maxHealth: 340,
  damage: 26,
  attackRate: 1.1,
  range: 1.05,
  projectileColor: 0xffd24a,
  scale: 1.05,
  attackSound: 'roar',
  buildModel: () =>
    buildCreature({
      bodyColor: 0x6f8a9c,
      secondaryColor: 0x49606f,
      accentColor: 0xf2e5c8,
      bellyColor: 0x9fb6c2,
      muzzleColor: 0x8ea6b4,
      limbColor: 0x4d6272,
      footColor: 0x33434f,
      earColor: 0x49606f,
      eyeColor: 0x14181c,
      bodyLength: 0.72,
      bodyRadius: 0.74,
      bodySquash: 1.02,
      legHeight: 0.6,
      legRadius: 0.24,
      legCount: 4,
      neckLength: 0.1,
      headRadius: 0.5,
      headScale: 1.2,
      snoutLength: 0.34,
      earType: 'round',
      earScale: 0.75,
      tailType: 'short',
      tailColor: 0x49606f,
      hornType: 'single',
      faceStyle: 'cartoon',
      eyeScale: 0.85,
      browColor: 0x2e3d47,
      browAngle: 0.55,
      roughness: 0.72,
      accessories: [
        { type: 'combat-helmet', color: 0xd6402f, accent: 0xffcf4a, scale: 0.86, offset: [-0.1, 0.16, 0] },
        { type: 'armor-plates', color: 0xc0392b, accent: 0xffcf4a, scale: 1.0 },
        { type: 'armor-skirt', color: 0x8f2a20, accent: 0xffcf4a, scale: 1.0 },
      ],
    }),
};
