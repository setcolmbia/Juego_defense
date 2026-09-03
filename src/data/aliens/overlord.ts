import { AlienForge, V } from '../../render/AlienBuilder';
import type { AlienStats } from '../../entities/Alien';

/**
 * OVERLORD COLOSSUS — the boss.
 *
 * Concept: a bio-mechanical siege crab. Six huge legs whose knees tower above
 * the hull give it a wide, spidery, unmistakably "boss" silhouette; a crown of
 * magenta crystal growths fans off its back; a caged crimson reactor core
 * burns openly in its chest; and a raised turret head carries six eyes over a
 * pair of heavy mandibles. Twice the footprint of anything else on the board,
 * and every cue on it — six legs, crown, exposed core, eye cluster — is the
 * opposite of a mammal.
 */
function buildOverlord() {
  const f = new AlienForge({
    shell: 0x2c1030,
    plate: 0x521436,
    limb: 0x6d5060,
    glow: 0xff3a2b,
    glow2: 0xff2e8b,
  });

  const hipY = 1.12;
  f.body.position.y = hipY + 0.18;

  // ---- massive faceted carapace ----------------------------------------
  f.hull(f.body, 'dodeca', 0.78, V(1.25, 0.82, 1.05), V(-0.06, 0, 0), f.shellMat);
  f.hull(f.body, 'icosa', 0.6, V(1.2, 0.55, 1.0), V(-0.16, -0.3, 0), f.plateMat);
  // shoulder ridge plates over the front legs
  for (const side of [1, -1] as const) {
    f.slab(f.body, V(0.9, 0.2, 0.5), V(0.2, 0.3, side * 0.62), f.plateMat, V(side * 0.55, 0, -0.2));
  }

  // ---- crown of crystal growths ----------------------------------------
  const crown: Array<[number, number, number, number]> = [
    // [x, z, height, tilt]
    [-0.02, 0.0, 0.92, -0.2],
    [-0.16, 0.3, 0.78, -0.3],
    [-0.16, -0.3, 0.78, -0.3],
    [-0.48, 0.16, 0.6, -0.62],
    [-0.48, -0.16, 0.6, -0.62],
    [-0.66, 0.0, 0.48, -0.85],
  ];
  for (const [x, z, h, tilt] of crown) {
    const c = f.spike(f.body, V(x, 0.5 + h * 0.36, z), 0.13, h, V(0, 0, tilt), f.plateMat, 4);
    c.scale.set(1, 1, 0.6);
    f.bead(f.body, V(x - Math.sin(tilt) * h * 0.5, 0.5 + h * 0.86, z), 0.075, f.glow2Mat);
  }

  // ---- exposed reactor core burning through the chest -------------------
  f.core(f.body, V(0.36, 0.58, 0), 0.22, 3, f.glowMat);
  // vent seams along the flanks
  for (const side of [1, -1] as const) {
    for (const x of [-0.1, -0.42]) {
      f.seam(f.body, V(0.16, 0.05, 0.06), V(x, -0.16, side * 0.72), f.glowSoftMat);
    }
  }

  // rear artillery stacks
  for (const side of [1, -1] as const) {
    f.bone(f.body, V(-0.58, 0.16, side * 0.3), V(-0.82, 0.8, side * 0.44), 0.13, 0.1, f.limbMat, 5);
    f.bead(f.body, V(-0.84, 0.84, side * 0.45), 0.08, f.glowSoftMat);
  }

  // ---- raised turret head: six eyes over heavy mandibles ---------------
  f.head.position.set(0, 0.42, 0);
  f.bone(f.head, V(0.42, -0.16, 0), V(0.88, 0.14, 0), 0.28, 0.24, f.limbMat, 6);
  f.hull(f.head, 'icosa', 0.38, V(1.2, 1.0, 1.05), V(1.02, 0.2, 0), f.shellMat);
  f.slab(f.head, V(0.2, 0.4, 0.62), V(1.3, 0.22, 0), f.darkMat, V(0, 0, 0.22));
  const upper = f.eyeCluster(f.head, V(1.33, 0.36, 0), 3, 0.07, 0.19, f.glowMat);
  const lower = f.eyeCluster(f.head, V(1.31, 0.14, 0), 3, 0.055, 0.15, f.glowMat);
  // brow horns
  for (const side of [1, -1] as const) {
    f.spike(f.head, V(1.02, 0.56, side * 0.24), 0.08, 0.5, V(side * 0.4, 0, -0.75), f.plateMat, 4);
  }

  const jawTop = f.mandiblePair(f.head, V(1.24, 0.06, 0), {
    length: 0.46,
    radius: 0.09,
    spread: 0.18,
    droop: -0.3,
    material: f.limbMat,
    tip: 0.45,
  });
  const jawBottom = f.mandiblePair(f.head, V(1.2, -0.2, 0), {
    length: 0.5,
    radius: 0.1,
    spread: 0.2,
    droop: 0.3,
    material: f.limbMat,
    tip: 0.45,
  });

  // ---- six towering crab legs, in tripod-gait order --------------------
  const rows: Array<[number, number, number, number]> = [
    // [hipX, kneeUp, kneeOut, footOut]
    [0.5, 0.72, 0.72, 0.92],
    [0.0, 0.8, 0.82, 1.04],
    [-0.5, 0.72, 0.72, 0.92],
  ];
  const order: Array<[number, 1 | -1]> = [];
  rows.forEach((_, i) => {
    const first: 1 | -1 = i === 1 ? -1 : 1;
    order.push([i, first], [i, (first === 1 ? -1 : 1) as 1 | -1]);
  });
  for (const [rowIdx, side] of order) {
    const [hipX, kneeUp, kneeOut, footOut] = rows[rowIdx];
    f.addLeg(
      f.insectLeg(V(hipX, hipY, side * 0.42), side, {
        kneeUp,
        kneeOut,
        kneeFwd: hipX * 0.2,
        footDrop: hipY,
        footOut,
        footFwd: hipX * 0.45 + 0.14,
        hipR: 0.14,
        tipR: 0.05,
        claw: true,
      }),
    );
    f.bead(f.root, V(hipX, hipY, side * 0.42), 0.16, f.plateMat);
  }

  return f.finish({ eyeL: upper[0], eyeR: lower[lower.length - 1], jawTop, jawBottom });
}

export const Overlord: AlienStats = {
  id: 'overlord',
  name: 'Overlord Colossus',
  maxHealth: 520,
  damage: 42,
  attackRate: 1.8,
  speed: 0.24,
  boss: true,
  scoreValue: 200,
  energyDropChance: 0.1,
  scale: 1.5,
  buildModel: buildOverlord,
};
