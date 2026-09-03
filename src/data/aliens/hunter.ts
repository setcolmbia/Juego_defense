import { AlienForge, V } from '../../render/AlienBuilder';
import type { AlienStats } from '../../entities/Alien';

/**
 * SHRIKE STALKER — fast glass cannon.
 *
 * Concept: a stilt-legged bio-mech skirmisher. Two very long reverse-jointed
 * legs whose knees stand higher than the body, a slender forward-pitched
 * spine, a rigid counterweight lance sticking out the back, backswept sensor
 * antennae, and a drill maw of four cyan mandibles instead of a head. It is
 * tall, thin and asymmetric top-to-bottom — no horizontal spine, no snout, no
 * ears — so it reads as a machine on legs, not a running animal.
 */
function buildHunter() {
  const f = new AlienForge({
    shell: 0x17283c,
    plate: 0x2f6f92,
    limb: 0x7d94a2,
    glow: 0x46e8ff,
    glow2: 0xa7f7ff,
  });

  const hipY = 1.06;
  f.body.position.y = hipY + 0.06;

  // ---- slender forward-pitched thorax ---------------------------------
  f.bone(f.body, V(-0.42, 0.24, 0), V(0.34, -0.12, 0), 0.13, 0.2, f.shellMat, 6);
  f.hull(f.body, 'octa', 0.3, V(1.25, 0.95, 0.9), V(0.06, 0.0, 0), f.shellMat, V(0, 0, -0.32));
  // shoulder yoke the legs hang from
  f.drum(f.body, { rTop: 0.2, rBottom: 0.2, height: 0.5, sides: 6, pos: V(-0.1, 0.06, 0), material: f.plateMat, rot: V(Math.PI / 2, 0, 0) });

  // dorsal spore sac with glowing pods
  f.hull(f.body, 'icosa', 0.24, V(1.1, 0.9, 0.95), V(-0.34, 0.3, 0), f.plateMat);
  f.seam(f.body, V(0.22, 0.05, 0.05), V(-0.32, 0.5, 0.06), f.glowSoftMat, V(0, 0, 0.2));
  f.seam(f.body, V(0.16, 0.045, 0.045), V(-0.3, 0.42, -0.14), f.glowSoftMat, V(0, 0, 0.2));

  // rigid counterweight lance out the back (not a tail — it never moves)
  f.bone(f.body, V(-0.48, 0.26, 0), V(-1.06, 0.56, 0), 0.1, 0.025, f.limbMat, 4);

  // backswept sensor antennae
  f.stalk(f.body, V(-0.16, 0.34, 0.16), V(-0.66, 0.94, 0.34), 0.03, 0.045);
  f.stalk(f.body, V(-0.16, 0.34, -0.16), V(-0.66, 0.94, -0.34), 0.03, 0.045);

  // ---- drill maw ------------------------------------------------------
  f.head.position.set(0, -0.16, 0);
  f.hull(f.head, 'octa', 0.22, V(1.3, 1.0, 1.0), V(0.44, 0, 0), f.plateMat);
  f.spike(f.head, V(0.64, 0, 0), 0.15, 0.3, V(0, 0, -Math.PI / 2), f.darkMat, 6);
  const eyes = f.eyeCluster(f.head, V(0.5, 0.13, 0), 4, 0.045, 0.13, f.glowMat);

  const jawTop = f.mandiblePair(f.head, V(0.56, 0.08, 0), {
    length: 0.34,
    radius: 0.055,
    spread: 0.1,
    droop: -0.3,
    material: f.limbMat,
    tip: 0,
  });
  const jawBottom = f.mandiblePair(f.head, V(0.56, -0.1, 0), {
    length: 0.36,
    radius: 0.06,
    spread: 0.12,
    droop: 0.3,
    material: f.limbMat,
    tip: 0.35,
    tipMaterial: f.glowSoftMat,
  });

  // ---- two long reverse-jointed stilt legs ----------------------------
  for (const side of [1, -1] as const) {
    const hip = V(-0.06, hipY, side * 0.19);
    const knee = hip.clone().add(V(-0.34, -0.3, side * 0.08));
    const ankle = hip.clone().add(V(0.26, -0.78, side * 0.1));
    const toe = hip.clone().add(V(0.34, -hipY, side * 0.1));
    f.addLeg(
      f.limb({
        joints: [hip, knee, ankle, toe],
        radii: [0.1, 0.085, 0.055, 0.035],
        material: f.limbMat,
        segments: 5,
        foot: { size: V(0.24, 0.06, 0.12), material: f.darkMat },
      }),
    );
  }

  return f.finish({ eyeL: eyes[0], eyeR: eyes[eyes.length - 1], jawTop, jawBottom });
}

export const Hunter: AlienStats = {
  id: 'hunter',
  name: 'Shrike Stalker',
  maxHealth: 85,
  damage: 24,
  attackRate: 1.6,
  speed: 0.58,
  scoreValue: 22,
  energyDropChance: 0.15,
  scale: 1.0,
  buildModel: buildHunter,
};
