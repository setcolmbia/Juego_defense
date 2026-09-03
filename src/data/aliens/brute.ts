import { AlienForge, V } from '../../render/AlienBuilder';
import type { AlienStats } from '../../entities/Alien';

/**
 * BULWARK WALKER — armored line-breaker.
 *
 * Concept: a War-of-the-Worlds tripod. A wide hexagonal cowl flares out over a
 * narrow armored core, carried on three thick reverse-jointed struts, with a
 * reactor venting violet out the back and — instead of a face — a solid brow
 * plate cut by one long horizontal visor slit. Vertical, top-heavy and
 * three-legged: no Earth animal has that body plan.
 */
function buildBrute() {
  const f = new AlienForge({
    shell: 0x2e2748,
    plate: 0x7460ad,
    limb: 0x8d8ba3,
    glow: 0xc46bff,
    glow2: 0xe9c4ff,
  });

  const hipY = 1.02;
  f.body.position.y = hipY + 0.2;

  // ---- narrow core column under a wide flared cowl ---------------------
  f.drum(f.body, { rTop: 0.42, rBottom: 0.3, height: 0.72, pos: V(-0.02, 0, 0), material: f.shellMat, scale: V(1.1, 1, 0.9) });
  // the cowl: the signature flared tripod cap
  f.drum(f.body, { rTop: 0.34, rBottom: 0.76, height: 0.36, pos: V(-0.04, 0.5, 0), material: f.plateMat, scale: V(1.05, 1, 0.9) });
  f.drum(f.body, { rTop: 0.26, rBottom: 0.34, height: 0.16, pos: V(-0.04, 0.74, 0), material: f.shellMat, scale: V(1.05, 1, 0.9) });
  // glowing rim vents under the cowl
  for (const side of [1, -1] as const) {
    f.seam(f.body, V(0.46, 0.05, 0.06), V(-0.02, 0.33, side * 0.6), f.glowSoftMat);
  }

  // chest armour + vertical vent seams
  f.slab(f.body, V(0.28, 0.6, 0.6), V(0.36, -0.06, 0), f.plateMat, V(0, 0, -0.14));
  for (const z of [-0.18, 0.18]) f.seam(f.body, V(0.05, 0.26, 0.05), V(0.51, -0.06, z), f.glowSoftMat);

  // rear reactor pod + exhaust stacks angled up and back
  f.hull(f.body, 'dodeca', 0.3, V(0.95, 1.0, 0.95), V(-0.5, 0.06, 0), f.shellMat);
  const rearCore = f.bead(f.body, V(-0.68, 0.1, 0), 0.11, f.glowSoftMat);
  rearCore.scale.set(0.5, 1, 1);
  for (const side of [1, -1] as const) {
    f.bone(f.body, V(-0.44, 0.32, side * 0.22), V(-0.72, 0.84, side * 0.3), 0.08, 0.06, f.limbMat, 5);
    f.bead(f.body, V(-0.72, 0.86, side * 0.3), 0.045, f.glowSoftMat);
  }

  // ---- brow plate with a visor slit where a face would be --------------
  f.head.position.set(0, 0.16, 0);
  f.slab(f.head, V(0.3, 0.42, 0.84), V(0.5, 0, 0), f.plateMat, V(0, 0, 0.14));
  f.slab(f.head, V(0.14, 0.2, 0.74), V(0.65, -0.08, 0), f.darkMat, V(0, 0, 0.14));
  // the visor itself: one wide slit of light
  f.seam(f.head, V(0.08, 0.12, 0.66), V(0.7, -0.08, 0), f.glowMat, V(0, 0, 0.14));
  const eyeL = f.bead(f.head, V(0.72, -0.07, 0.31), 0.05, f.glowMat);
  const eyeR = f.bead(f.head, V(0.72, -0.07, -0.31), 0.05, f.glowMat);
  // horn plates flanking the brow
  for (const side of [1, -1] as const) {
    const horn = f.spike(f.head, V(0.42, 0.3, side * 0.4), 0.12, 0.46, V(side * 0.5, 0, -0.5), f.plateMat, 4);
    horn.scale.set(1, 1, 0.4);
  }

  // underslung crusher clamp — drops open on the attack beat
  const jawBottom = f.mandiblePair(f.head, V(0.5, -0.3, 0), {
    length: 0.38,
    radius: 0.09,
    spread: 0.22,
    droop: 0.14,
    material: f.limbMat,
    tip: 0.35,
    tipMaterial: f.glowSoftMat,
  });

  // ---- three heavy struts: one forward, two splayed back --------------
  const mounts: Array<[number, number, number]> = [
    // [hipX, hipZ, lateral splay]
    [0.42, 0.0, 0],
    [-0.3, 0.44, 1],
    [-0.3, -0.44, -1],
  ];
  for (const [hx, hz, side] of mounts) {
    const hip = V(hx, hipY, hz);
    const knee = hip.clone().add(V(-0.3, 0.22, side * 0.2));
    const ankle = hip.clone().add(V(0.26, -0.58, side * 0.36));
    const foot = hip.clone().add(V(0.36, -hipY, side * 0.44));
    f.addLeg(
      f.limb({
        joints: [hip, knee, ankle, foot],
        radii: [0.17, 0.15, 0.09, 0.07],
        material: f.limbMat,
        segments: 5,
        foot: { size: V(0.34, 0.11, 0.26), material: f.plateMat },
      }),
    );
    f.bead(f.root, hip, 0.16, f.plateMat);
  }

  return f.finish({ eyeL, eyeR, jawBottom });
}

export const Brute: AlienStats = {
  id: 'brute',
  name: 'Bulwark Walker',
  maxHealth: 160,
  damage: 18,
  attackRate: 1.2,
  speed: 0.34,
  scoreValue: 25,
  energyDropChance: 0.2,
  scale: 1.0,
  buildModel: buildBrute,
};
