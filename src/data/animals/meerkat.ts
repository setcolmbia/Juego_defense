import { buildCreature } from '../../render/CreatureBuilder';
import type { DefenderStats } from '../../entities/Defender';

/**
 * The lookout of the militia: a small, upright, wide-eyed scout in an olive
 * field cap with binoculars around its neck and a supply satchel on its hip.
 * Read at a glance: the only tall, skinny, bright-amber silhouette on the
 * board — everything else is a wide four-legged mass.
 */
export const Meerkat: DefenderStats = {
  id: 'meerkat',
  name: 'Meerkat Sentinel',
  description: 'Vigía del campamento. Genera energía con el tiempo; frágil pero vital.',
  icon: '🦫',
  cost: 30,
  cooldown: 5,
  maxHealth: 45,
  damage: 0,
  attackRate: 0,
  range: 0,
  isSupport: true,
  energyInterval: 8,
  energyAmount: 25,
  projectileColor: 0xfff2c0,
  scale: 0.92,
  attackSound: 'peck',
  buildModel: () =>
    buildCreature({
      stance: 'biped',
      bodyColor: 0xf0a33c,
      secondaryColor: 0xc26e22,
      accentColor: 0xffd84a,
      bellyColor: 0xffe9c0,
      muzzleColor: 0xffe9c0,
      limbColor: 0xd8842c,
      footColor: 0x8a4a18,
      earColor: 0x5c3116,
      eyeColor: 0x181410,
      bodyLength: 0.72,
      bodyRadius: 0.3,
      bodySquash: 1.05,
      legHeight: 0.42,
      legRadius: 0.115,
      legCount: 2,
      neckLength: 0.08,
      headRadius: 0.32,
      headScale: 1.3,
      snoutLength: 0.13,
      earType: 'round',
      earScale: 1.15,
      tailType: 'long',
      tailColor: 0xc26e22,
      tailTipColor: 0x4a2a12,
      hornType: 'none',
      faceStyle: 'cartoon',
      eyeScale: 1.05,
      browColor: 0x5c3116,
      browAngle: -0.2,
      hasArms: true,
      armColor: 0xd8842c,
      armPose: 0.62,
      roughness: 0.85,
      accessories: [
        { type: 'scout-cap', color: 0x4f7f3a, accent: 0xffd84a, scale: 1.05 },
        { type: 'neckerchief', color: 0xe2453a, accent: 0xe2453a, scale: 1.1 },
        { type: 'binoculars', color: 0x2b2724, accent: 0x8fe3ff, scale: 1.3, offset: [0.04, -0.02, 0] },
        { type: 'satchel', color: 0x7a5326, accent: 0xffd84a, scale: 1.0 },
      ],
    }),
};
