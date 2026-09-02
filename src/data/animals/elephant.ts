import { buildCreature } from '../../render/CreatureBuilder';
import type { DefenderStats } from '../../entities/Defender';

export const Elephant: DefenderStats = {
  id: 'elephant',
  name: 'War Elephant',
  description: 'Pisotón devastador que golpea a todos los enemigos cercanos.',
  icon: '🐘',
  cost: 165,
  cooldown: 10,
  maxHealth: 520,
  damage: 45,
  attackRate: 2.0,
  range: 1.1,
  aoeRadius: 1.5,
  projectileColor: 0xffb37a,
  scale: 1.25,
  attackSound: 'roar',
  buildModel: () =>
    buildCreature({
      bodyColor: 0x6e6e78,
      secondaryColor: 0x46464e,
      accentColor: 0xe8e0c8,
      eyeColor: 0x1a1a1a,
      bodyLength: 2.4,
      bodyRadius: 0.95,
      legHeight: 0.85,
      legRadius: 0.3,
      legCount: 4,
      neckLength: 0.15,
      headRadius: 0.62,
      snoutLength: 0.55,
      earType: 'long',
      tailType: 'short',
      hornType: 'double',
      armored: true,
      roughness: 0.75,
    }),
};
