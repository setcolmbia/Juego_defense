import { AlienForge, V } from '../../render/AlienBuilder';
import type { AlienStats } from '../../entities/Alien';

/**
 * SCUTTLER DRONE — cheap swarm unit.
 *
 * Concept: a knee-high arachnid skitter-mine. Six thin mechanical legs whose
 * knees rise well above the hull, a squat faceted beetle-shell pod almost
 * dragging on the ground, a single acid-green optic up front and a pair of
 * snapping pincers. Nothing about it is mammalian: no neck, no snout, no ears,
 * no tail — just a hull carried by a sprawl of legs.
 */
function buildScuttler() {
  const f = new AlienForge({
    shell: 0x4a4270,
    plate: 0x6f62a5,
    limb: 0x848d9e,
    glow: 0x9dff4d,
    glow2: 0xd7ff7a,
  });

  const hipY = 0.44;
  f.body.position.y = hipY + 0.06;

  // ---- carapace: low faceted beetle dome -------------------------------
  f.hull(f.body, 'icosa', 0.44, V(1.35, 0.62, 1.05), V(-0.02, 0, 0), f.shellMat);
  f.hull(f.body, 'octa', 0.34, V(1.15, 0.5, 1.0), V(-0.08, -0.16, 0), f.plateMat);

  // dorsal energy seam
  f.seam(f.body, V(0.34, 0.06, 0.1), V(-0.02, 0.25, 0), f.glowMat, V(0, 0, -0.08));
  f.seam(f.body, V(0.14, 0.05, 0.08), V(-0.34, 0.19, 0), f.glowSoftMat, V(0, 0, 0.15));

  // rear thruster stack (a vent, not a tail) with a hot exhaust bead
  const vent = f.spike(f.body, V(-0.46, 0.14, 0), 0.11, 0.3, V(0, 0, 1.95), f.plateMat, 5);
  vent.scale.set(1, 1, 0.8);
  f.bead(f.body, V(-0.6, 0.23, 0), 0.05, f.glowSoftMat);

  // ---- sensor prow / head ----------------------------------------------
  f.head.position.set(0, 0.02, 0);
  const prow = f.spike(f.head, V(0.46, 0, 0), 0.24, 0.4, V(0, 0, -Math.PI / 2), f.plateMat, 5);
  prow.scale.set(1, 1, 0.75);
  const optic = f.optic(f.head, V(0.44, 0.06, 0), 0.11, f.glowMat);
  // forward-swept antennae
  f.stalk(f.head, V(0.18, 0.18, 0.16), V(0.58, 0.56, 0.32), 0.032, 0.038);
  f.stalk(f.head, V(0.18, 0.18, -0.16), V(0.58, 0.56, -0.32), 0.032, 0.038);

  // pincers under the prow: the lower pair snaps on the attack beat
  const jawTop = f.mandiblePair(f.head, V(0.44, 0.0, 0), {
    length: 0.28,
    radius: 0.05,
    spread: 0.11,
    droop: -0.18,
    material: f.limbMat,
    tip: 0,
  });
  const jawBottom = f.mandiblePair(f.head, V(0.42, -0.16, 0), {
    length: 0.3,
    radius: 0.055,
    spread: 0.13,
    droop: 0.16,
    material: f.limbMat,
    tip: 0.4,
    tipMaterial: f.glowSoftMat,
  });

  // ---- six legs, pushed in tripod-gait order ---------------------------
  // Index parity drives the swing, so FL/MR/RL share a phase and FR/ML/RR
  // share the other — a real alternating-tripod insect gait.
  const rows: Array<[number, number, number]> = [
    // [hipX, kneeOut, footOut]
    [0.32, 0.5, 0.62],
    [0.0, 0.56, 0.72],
    [-0.32, 0.5, 0.62],
  ];
  const order: Array<[number, 1 | -1]> = [];
  rows.forEach((_, i) => {
    const first: 1 | -1 = i === 1 ? -1 : 1;
    order.push([i, first], [i, (first === 1 ? -1 : 1) as 1 | -1]);
  });
  for (const [rowIdx, side] of order) {
    const [hipX, kneeOut, footOut] = rows[rowIdx];
    f.addLeg(
      f.insectLeg(V(hipX, hipY, side * 0.2), side, {
        kneeUp: 0.46,
        kneeOut,
        kneeFwd: hipX * 0.15,
        footDrop: hipY,
        footOut,
        footFwd: hipX * 0.5 + 0.12,
        hipR: 0.075,
        tipR: 0.03,
      }),
    );
  }

  return f.finish({ eyeL: optic, jawTop, jawBottom });
}

export const Scuttler: AlienStats = {
  id: 'scuttler',
  name: 'Scuttler Drone',
  maxHealth: 60,
  damage: 8,
  attackRate: 0.8,
  speed: 0.62,
  scoreValue: 10,
  energyDropChance: 0.12,
  scale: 1.05,
  buildModel: buildScuttler,
};
