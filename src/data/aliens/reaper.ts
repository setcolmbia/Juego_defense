import { AlienForge, V } from '../../render/AlienBuilder';
import type { AlienStats } from '../../entities/Alien';

/**
 * VOID REAPER — the flyer.
 *
 * Concept: a legless hovering interceptor pod. A faceted magenta-cored crystal
 * hull with one huge cyclopean optic, a gravity repulsor ring glowing
 * underneath, two swept energy vanes that beat, and three drifting tendrils
 * hanging beneath it. It never touches the ground and has no limbs to stand
 * on, so it cannot read as any Earth creature — the closest reference is a
 * UFO, which is exactly the point.
 */
function buildReaper() {
  const f = new AlienForge({
    shell: 0x43265e,
    plate: 0x8b4bb4,
    limb: 0x9b8cb4,
    glow: 0xff4dc4,
    glow2: 0xffa8e4,
  });

  const hoverY = 0.78;
  f.body.position.y = hoverY;

  // ---- faceted teardrop hull ------------------------------------------
  f.hull(f.body, 'octa', 0.46, V(1.55, 0.9, 1.0), V(0.0, 0, 0), f.shellMat, V(0, 0, -0.18));
  f.hull(f.body, 'octa', 0.3, V(1.1, 0.6, 1.15), V(-0.16, -0.16, 0), f.plateMat);
  // dorsal crystal spire
  f.spike(f.body, V(-0.1, 0.44, 0), 0.2, 0.6, V(0, 0, -0.3), f.plateMat, 4).scale.set(1, 1, 0.3);

  // rear thruster cluster
  for (const side of [1, -1] as const) {
    f.drum(f.body, {
      rTop: 0.09,
      rBottom: 0.12,
      height: 0.24,
      sides: 6,
      pos: V(-0.5, 0.02, side * 0.17),
      material: f.plateMat,
      rot: V(0, 0, Math.PI / 2),
    });
    f.bead(f.body, V(-0.62, 0.02, side * 0.17), 0.06, f.glowSoftMat);
  }

  // ---- repulsor ring: the "it is hovering" cue -------------------------
  f.repulsor(f.body, V(-0.04, -0.34, 0), 0.4, 0.06);

  // ---- cyclopean optic --------------------------------------------------
  f.head.position.set(0, -0.02, 0);
  f.hull(f.head, 'octa', 0.22, V(1.0, 1.0, 1.0), V(0.5, 0.02, 0), f.plateMat);
  const optic = f.optic(f.head, V(0.64, 0.0, 0), 0.17, f.glowMat);
  // brow fangs framing the eye
  for (const side of [1, -1] as const) {
    f.spike(f.head, V(0.6, -0.2, side * 0.16), 0.05, 0.3, V(0, 0, -2.0), f.limbMat, 4);
  }

  // ---- energy vanes (wings) --------------------------------------------
  // Swept delta fins with fore/aft extent, so the `rotation.z` oscillation
  // Alien.update() applies to wingL/wingR rolls the tips visibly up and down.
  const makeVane = (side: 1 | -1) => {
    const pivot = f.mount(f.body, V(-0.2, 0.06, side * 0.22));
    const fin = f.mount(pivot, V(0, 0, 0), V(side * -0.24, side * 0.72, 0));
    f.slab(fin, V(0.62, 0.06, 0.66), V(-0.04, 0, side * 0.42), f.plateMat);
    f.seam(fin, V(0.07, 0.07, 0.6), V(0.28, 0.01, side * 0.42), f.glowSoftMat);
    f.bead(fin, V(-0.1, 0.01, side * 0.76), 0.05, f.glowMat);
    return pivot;
  };
  const wingL = makeVane(1);
  const wingR = makeVane(-1);

  // ---- three drifting tendrils (registered as legs so they sway) -------
  const tendrils: Array<[number, number]> = [
    [0.16, 0.24],
    [-0.24, -0.02],
    [0.02, -0.26],
  ];
  for (const [tx, tz] of tendrils) {
    const a = V(tx, hoverY - 0.34, tz);
    f.addLeg(
      f.limb({
        joints: [a, a.clone().add(V(0.02, -0.22, tz * 0.35)), a.clone().add(V(-0.04, -0.44, tz * 0.7))],
        radii: [0.05, 0.032, 0.014],
        material: f.limbMat,
        segments: 4,
        knuckles: false,
        tip: { radius: 0.045, material: f.glowSoftMat },
      }),
    );
  }

  return f.finish({ eyeL: optic, wingL, wingR });
}

export const Reaper: AlienStats = {
  id: 'reaper',
  name: 'Void Reaper',
  maxHealth: 100,
  damage: 12,
  attackRate: 1.0,
  speed: 0.5,
  flying: true,
  scoreValue: 30,
  energyDropChance: 0.18,
  scale: 0.95,
  buildModel: buildReaper,
};
