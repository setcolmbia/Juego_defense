import { buildCreature } from '../../render/CreatureBuilder';
import type { DefenderStats } from '../../entities/Defender';

/**
 * The artillery grunt. Low, wide, teal body under a blaze-orange fan of
 * quills — its ammunition is its silhouette, so the quills are oversized,
 * two-tone and swept back over the whole spine. Welding goggles and a
 * bandolier of pouches sell "cheap infantry that shoots things".
 */
export const Porcupine: DefenderStats = {
  id: 'porcupine',
  name: 'Quill Porcupine',
  description: 'Artillero de púas. Dispara a distancia; versátil y económico.',
  icon: '🦔',
  cost: 50,
  cooldown: 4,
  maxHealth: 90,
  damage: 12,
  attackRate: 0.9,
  range: 7,
  projectileColor: 0xff9a3c,
  scale: 0.95,
  attackSound: 'spike',
  buildModel: () =>
    buildCreature({
      bodyColor: 0x2f7f96,
      secondaryColor: 0x1c5065,
      accentColor: 0xff8a2b,
      bellyColor: 0xc3e5ec,
      muzzleColor: 0xdff1f5,
      limbColor: 0x1c5065,
      footColor: 0x123c4d,
      earColor: 0x3d97ad,
      eyeColor: 0x141414,
      bodyLength: 0.6,
      bodyRadius: 0.56,
      bodySquash: 0.95,
      legHeight: 0.4,
      legRadius: 0.15,
      legCount: 4,
      neckLength: 0.06,
      headRadius: 0.36,
      headScale: 1.28,
      snoutLength: 0.24,
      earType: 'round',
      earScale: 0.7,
      tailType: 'short',
      tailColor: 0x1c5065,
      hornType: 'none',
      spikeCount: 15,
      spikeTipColor: 0xff8a2b,
      faceStyle: 'cartoon',
      eyeScale: 1.0,
      browColor: 0x123c4d,
      browAngle: 0.45,
      roughness: 0.8,
      accessories: [
        { type: 'goggles', color: 0x6b4a28, accent: 0xffd24a, scale: 1.0 },
        { type: 'chest-strap', color: 0x7a4a24, accent: 0xffb03a, scale: 1.05 },
      ],
    }),
};
