import * as THREE from 'three';
import type { CreatureRig } from './CreatureBuilder';

/**
 * Alien invader construction kit.
 *
 * The player's animals are built by `CreatureBuilder` (a quadruped/animal
 * generator). Attackers must NOT share that vocabulary — they are sci-fi
 * invaders, not Earth fauna. So they get their own parts bin here: hovering
 * hulls, repulsor rings, tripod struts, insect limbs, mandible clusters,
 * cyclopean optics, sensor stalks, crystal growths and caged energy cores.
 *
 * Contract with `Alien.update()` (see src/entities/Alien.ts):
 *  - models are authored head-first along local +X (the game yaws them 180deg),
 *  - `legs[i].rotation.x` is swung for the gait, alternating by index parity,
 *  - `body.position.y` is the bob baseline,
 *  - `head.position.x` is ASSIGNED (not added) during the attack jab, so the
 *    head group must sit at local x = 0 and offset its contents instead,
 *  - `jawBottom.rotation.z` drops on the attack beat,
 *  - `wingL/wingR.rotation.z` oscillate for flyers, so anything hung off them
 *    needs fore/aft (X) extent to actually visibly sweep,
 *  - every mesh must be in `allMeshes` with a MeshStandardMaterial so the
 *    hit-flash can swap `emissive` and restore it from userData.
 */

export interface AlienPalette {
  /** Dark carapace / hull base. */
  shell: number;
  /** Armour plating, slightly lighter than the shell. */
  plate: number;
  /** Limbs, struts, mechanical bits. */
  limb: number;
  /** Primary emissive accent (cores, optics, seams). */
  glow: number;
  /** Optional secondary emissive accent (crystals, vents). */
  glow2?: number;
}

const UP = new THREE.Vector3(0, 1, 0);

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Options for a segmented alien limb (insect leg, tripod strut, tentacle). */
export interface LimbOptions {
  /** Absolute joint positions in root space; the first one is the pivot. */
  joints: THREE.Vector3[];
  /** Radius at each joint (same length as `joints`). */
  radii: number[];
  material?: THREE.Material;
  /** Sphere knuckles at the interior joints. */
  knuckles?: boolean;
  /** Radial segments; 4-5 keeps limbs faceted and hard-edged. */
  segments?: number;
  /** Flat pad / claw at the last joint. */
  foot?: { size: THREE.Vector3; material?: THREE.Material } | null;
  /** Emissive bead at the tip (energy tendrils, sensor stalks). */
  tip?: { radius: number; material?: THREE.Material } | null;
}

export class AlienForge {
  readonly root = new THREE.Group();
  /** Main mass; bobs vertically while walking. */
  readonly body = new THREE.Group();
  /** Business end; jabs forward on attack. Must stay at local x = 0. */
  readonly head = new THREE.Group();
  readonly legs: THREE.Group[] = [];
  readonly meshes: THREE.Mesh[] = [];

  readonly shellMat: THREE.MeshStandardMaterial;
  readonly plateMat: THREE.MeshStandardMaterial;
  readonly limbMat: THREE.MeshStandardMaterial;
  readonly darkMat: THREE.MeshStandardMaterial;
  /** Hot accent — small parts only, bloom washes large emissive surfaces out. */
  readonly glowMat: THREE.MeshStandardMaterial;
  readonly glowSoftMat: THREE.MeshStandardMaterial;
  readonly glow2Mat: THREE.MeshStandardMaterial;

  constructor(readonly palette: AlienPalette) {
    this.shellMat = this.material(palette.shell, { rough: 0.6, metal: 0.15, emissive: palette.glow, ei: 0.03 });
    this.plateMat = this.material(palette.plate, { rough: 0.42, metal: 0.3, emissive: palette.glow, ei: 0.05 });
    this.limbMat = this.material(palette.limb, { rough: 0.45, metal: 0.28 });
    this.darkMat = this.material(0x14121c, { rough: 0.4, metal: 0.25 });
    this.glowMat = this.material(palette.glow, { rough: 0.25, metal: 0.0, emissive: palette.glow, ei: 1.3 });
    this.glowSoftMat = this.material(palette.glow, { rough: 0.3, metal: 0.1, emissive: palette.glow, ei: 0.6 });
    this.glow2Mat = this.material(palette.glow2 ?? palette.glow, {
      rough: 0.25,
      metal: 0.1,
      emissive: palette.glow2 ?? palette.glow,
      ei: 1.1,
    });
    this.root.add(this.body);
    this.body.add(this.head);
  }

  /** MeshStandardMaterial with the hit-flash restore values pre-recorded. */
  material(
    color: number,
    opts: { rough?: number; metal?: number; emissive?: number; ei?: number } = {},
  ): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.55,
      metalness: opts.metal ?? 0.35,
      flatShading: true,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.ei ?? 0,
    });
    m.userData.baseEmissiveHex = m.emissive.getHex();
    m.userData.baseEmissiveIntensity = m.emissiveIntensity;
    return m;
  }

  mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    const std = material as THREE.MeshStandardMaterial;
    if (std.emissive && material.userData.baseEmissiveHex === undefined) {
      material.userData.baseEmissiveHex = std.emissive.getHex();
      material.userData.baseEmissiveIntensity = std.emissiveIntensity;
    }
    parent.add(m);
    this.meshes.push(m);
    return m;
  }

  /** Empty attachment group — pivot for vanes, wings, sub-assemblies. */
  mount(parent: THREE.Object3D, pos: THREE.Vector3, rot?: THREE.Vector3): THREE.Group {
    const g = new THREE.Group();
    g.position.copy(pos);
    if (rot) g.rotation.set(rot.x, rot.y, rot.z);
    parent.add(g);
    return g;
  }

  // ---------------------------------------------------------------- volumes

  /** Faceted hull blob (octa/dodeca/icosa) — the low-poly alien body unit. */
  hull(
    parent: THREE.Object3D,
    kind: 'octa' | 'dodeca' | 'icosa',
    radius: number,
    scale: THREE.Vector3,
    pos: THREE.Vector3,
    material: THREE.Material = this.shellMat,
    rot?: THREE.Vector3,
  ): THREE.Mesh {
    const geo =
      kind === 'octa'
        ? new THREE.OctahedronGeometry(radius, 0)
        : kind === 'dodeca'
          ? new THREE.DodecahedronGeometry(radius, 0)
          : new THREE.IcosahedronGeometry(radius, 0);
    const m = this.mesh(parent, geo, material);
    m.scale.copy(scale);
    m.position.copy(pos);
    if (rot) m.rotation.set(rot.x, rot.y, rot.z);
    return m;
  }

  /** Hard-edged armour slab. */
  slab(
    parent: THREE.Object3D,
    size: THREE.Vector3,
    pos: THREE.Vector3,
    material: THREE.Material = this.plateMat,
    rot?: THREE.Vector3,
  ): THREE.Mesh {
    const m = this.mesh(parent, new THREE.BoxGeometry(size.x, size.y, size.z), material);
    m.position.copy(pos);
    if (rot) m.rotation.set(rot.x, rot.y, rot.z);
    return m;
  }

  /** Faceted drum / prism — hexagonal siege hulls, collars, turret barrels. */
  drum(
    parent: THREE.Object3D,
    o: {
      rTop: number;
      rBottom: number;
      height: number;
      sides?: number;
      pos: THREE.Vector3;
      material?: THREE.Material;
      rot?: THREE.Vector3;
      scale?: THREE.Vector3;
    },
  ): THREE.Mesh {
    const m = this.mesh(
      parent,
      new THREE.CylinderGeometry(o.rTop, o.rBottom, o.height, o.sides ?? 6, 1),
      o.material ?? this.shellMat,
    );
    m.position.copy(o.pos);
    m.rotation.set(o.rot?.x ?? 0, o.rot?.y ?? Math.PI / (o.sides ?? 6), o.rot?.z ?? 0);
    if (o.scale) m.scale.copy(o.scale);
    return m;
  }

  /** Small faceted bead — glowing node, rivet, eye, thruster mouth. */
  bead(
    parent: THREE.Object3D,
    pos: THREE.Vector3,
    radius: number,
    material: THREE.Material = this.glowMat,
    scale?: THREE.Vector3,
  ): THREE.Mesh {
    const m = this.mesh(parent, new THREE.IcosahedronGeometry(radius, 0), material);
    m.position.copy(pos);
    if (scale) m.scale.copy(scale);
    return m;
  }

  /** Thin emissive seam / vent line. Keep these small — bloom is aggressive. */
  seam(
    parent: THREE.Object3D,
    size: THREE.Vector3,
    pos: THREE.Vector3,
    material: THREE.Material = this.glowMat,
    rot?: THREE.Vector3,
  ): THREE.Mesh {
    const m = this.mesh(parent, new THREE.BoxGeometry(size.x, size.y, size.z), material);
    m.position.copy(pos);
    if (rot) m.rotation.set(rot.x, rot.y, rot.z);
    return m;
  }

  /** Tapered cylinder between two points (bone, strut, stalk). */
  bone(
    parent: THREE.Object3D,
    a: THREE.Vector3,
    b: THREE.Vector3,
    rA: number,
    rB: number,
    material: THREE.Material = this.limbMat,
    segments = 5,
  ): THREE.Mesh | null {
    const dir = b.clone().sub(a);
    const len = dir.length();
    if (len < 1e-4) return null;
    const geo = new THREE.CylinderGeometry(rB, rA, len, segments, 1);
    const m = this.mesh(parent, geo, material);
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    return m;
  }

  /** Spike / crystal growth / mandible tusk. */
  spike(
    parent: THREE.Object3D,
    pos: THREE.Vector3,
    radius: number,
    height: number,
    rot: THREE.Vector3,
    material: THREE.Material = this.plateMat,
    segments = 4,
  ): THREE.Mesh {
    const m = this.mesh(parent, new THREE.ConeGeometry(radius, height, segments), material);
    m.position.copy(pos);
    m.rotation.set(rot.x, rot.y, rot.z);
    return m;
  }

  // ------------------------------------------------------------------ limbs

  /**
   * Segmented limb whose pivot is at `joints[0]`, so the animation system's
   * `rotation.x` swing reads as a stroke from the hip / mount point.
   */
  limb(opts: LimbOptions): THREE.Group {
    const g = new THREE.Group();
    const anchor = opts.joints[0];
    g.position.copy(anchor);
    const mat = opts.material ?? this.limbMat;
    const local = opts.joints.map((j) => j.clone().sub(anchor));
    for (let i = 0; i < local.length - 1; i++) {
      this.bone(g, local[i], local[i + 1], opts.radii[i], opts.radii[i + 1], mat, opts.segments ?? 5);
      if (i > 0 && opts.knuckles !== false) {
        const k = this.mesh(g, new THREE.IcosahedronGeometry(opts.radii[i] * 1.35, 0), mat);
        k.position.copy(local[i]);
      }
    }
    const last = local[local.length - 1];
    if (opts.foot) {
      const f = this.mesh(
        g,
        new THREE.BoxGeometry(opts.foot.size.x, opts.foot.size.y, opts.foot.size.z),
        opts.foot.material ?? mat,
      );
      f.position.copy(last).add(V(0, -opts.foot.size.y * 0.4, 0));
    }
    if (opts.tip) {
      const t = this.mesh(g, new THREE.IcosahedronGeometry(opts.tip.radius, 0), opts.tip.material ?? this.glowMat);
      t.position.copy(last);
    }
    return g;
  }

  /** Registers a limb group as an animated leg (order defines gait phase). */
  addLeg(group: THREE.Group): THREE.Group {
    this.root.add(group);
    this.legs.push(group);
    return group;
  }

  /**
   * Classic insect/arachnid leg: hip out to a knee ABOVE the body line, then
   * down and further out to a clawed foot. The high knee is the single
   * strongest cue that a silhouette is a bug or a walker, not a mammal.
   */
  insectLeg(hip: THREE.Vector3, side: 1 | -1, o: {
    kneeUp: number;
    kneeOut: number;
    kneeFwd?: number;
    footDrop: number;
    footOut: number;
    footFwd?: number;
    hipR: number;
    tipR: number;
    material?: THREE.Material;
    claw?: boolean;
  }): THREE.Group {
    const knee = hip.clone().add(V(o.kneeFwd ?? 0, o.kneeUp, side * o.kneeOut));
    const foot = hip.clone().add(V(o.footFwd ?? 0, -o.footDrop, side * o.footOut));
    const mid = knee.clone().lerp(foot, 0.55);
    return this.limb({
      joints: [hip, knee, mid, foot],
      radii: [o.hipR, o.hipR * 0.78, o.hipR * 0.45, o.tipR],
      material: o.material,
      segments: 5,
      foot: o.claw ? { size: V(0.16, 0.06, 0.1), material: this.darkMat } : null,
    });
  }

  // ------------------------------------------------------------ alien parts

  /**
   * Cyclopean optic: recessed dark socket, hard housing ring, emissive lens.
   * Faces +X. This replaces the animal "face" outright.
   */
  optic(parent: THREE.Object3D, pos: THREE.Vector3, radius: number, lensMat: THREE.Material = this.glowMat): THREE.Mesh {
    const socket = this.mesh(parent, new THREE.CylinderGeometry(radius * 1.1, radius * 1.3, radius * 0.7, 8), this.shellMat);
    socket.position.copy(pos);
    socket.rotation.z = Math.PI / 2;
    const ring = this.mesh(parent, new THREE.TorusGeometry(radius * 1.2, radius * 0.22, 4, 10), this.plateMat);
    ring.position.copy(pos).add(V(radius * 0.22, 0, 0));
    ring.rotation.y = Math.PI / 2;
    const lens = this.mesh(parent, new THREE.SphereGeometry(radius, 8, 6), lensMat);
    lens.position.copy(pos).add(V(radius * 0.34, 0, 0));
    lens.scale.set(0.55, 1, 1);
    return lens;
  }

  /** A row/arc of small glowing eyes — inhuman sensor cluster. */
  eyeCluster(
    parent: THREE.Object3D,
    origin: THREE.Vector3,
    count: number,
    radius: number,
    spread: number,
    material: THREE.Material = this.glowMat,
  ): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
      const e = this.mesh(parent, new THREE.IcosahedronGeometry(radius * (1 - Math.abs(t) * 0.25), 0), material);
      e.position.copy(origin).add(V(-Math.abs(t) * spread * 0.35, Math.abs(t) * spread * 0.18, t * spread));
      out.push(e);
    }
    return out;
  }

  /** Antenna / sensor stalk with an emissive bead at the tip. */
  stalk(parent: THREE.Object3D, base: THREE.Vector3, tip: THREE.Vector3, radius: number, beadR = 0.05): THREE.Mesh {
    const mid = base.clone().lerp(tip, 0.5).add(V(0, radius * 1.2, 0));
    this.bone(parent, base, mid, radius, radius * 0.8, this.limbMat, 4);
    this.bone(parent, mid, tip, radius * 0.8, radius * 0.4, this.limbMat, 4);
    const bead = this.mesh(parent, new THREE.IcosahedronGeometry(beadR, 0), this.glowMat);
    bead.position.copy(tip);
    return bead;
  }

  /** Exposed energy core caged behind rib plates. */
  core(parent: THREE.Object3D, pos: THREE.Vector3, radius: number, ribs = 3, material: THREE.Material = this.glowMat) {
    const c = this.mesh(parent, new THREE.IcosahedronGeometry(radius, 0), material);
    c.position.copy(pos);
    // Thin dark backing plate so the core reads as recessed into the hull
    // rather than as a ball stuck on it — it must not occlude the core.
    const shroud = this.mesh(parent, new THREE.SphereGeometry(radius * 1.15, 8, 6), this.darkMat);
    shroud.position.copy(pos).add(V(-radius * 0.85, 0, 0));
    shroud.scale.set(0.3, 0.95, 0.95);
    for (let i = 0; i < ribs; i++) {
      const t = ribs === 1 ? 0 : (i / (ribs - 1)) * 2 - 1;
      const rib = this.slab(
        parent,
        V(radius * 0.4, radius * 2.5, radius * 0.28),
        pos.clone().add(V(radius * 0.75, 0, t * radius * 0.85)),
        this.plateMat,
        V(t * 0.35, 0, 0),
      );
      rib.scale.y = 1 - Math.abs(t) * 0.25;
    }
    return c;
  }

  /**
   * Anti-gravity repulsor ring with a glowing underside disc — the "no legs,
   * it is floating" cue.
   */
  repulsor(parent: THREE.Object3D, pos: THREE.Vector3, radius: number, tube: number) {
    const ring = this.mesh(parent, new THREE.TorusGeometry(radius, tube, 4, 12), this.plateMat);
    ring.position.copy(pos);
    ring.rotation.x = Math.PI / 2;
    ring.scale.x = 1.15;
    const disc = this.mesh(parent, new THREE.CylinderGeometry(radius * 0.8, radius * 0.45, tube * 0.9, 12), this.glowMat);
    disc.position.copy(pos).add(V(0, -tube * 1.2, 0));
    disc.scale.x = 1.15;
    // Inner glow ring, readable from the game's elevated camera (the underside
    // disc alone is never seen from up there).
    const inner = this.mesh(parent, new THREE.TorusGeometry(radius * 0.7, tube * 0.45, 4, 12), this.glowSoftMat);
    inner.position.copy(pos).add(V(0, tube * 0.2, 0));
    inner.rotation.x = Math.PI / 2;
    inner.scale.x = 1.15;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      this.bone(
        parent,
        pos.clone().add(V(0, tube * 3.2, 0)),
        pos.clone().add(V(Math.cos(a) * radius * 1.05, 0, Math.sin(a) * radius * 0.92)),
        tube * 0.7,
        tube * 0.5,
        this.plateMat,
        4,
      );
    }
    return ring;
  }

  /** Mandible pair: two curved tusks fanning out from a hinge. Faces +X. */
  mandiblePair(
    parent: THREE.Object3D,
    origin: THREE.Vector3,
    o: {
      length: number;
      radius: number;
      spread: number;
      droop: number;
      material?: THREE.Material;
      /** Emissive tip radius as a fraction of `radius`; 0 disables the tips. */
      tip?: number;
      tipMaterial?: THREE.Material;
    },
  ): THREE.Group {
    const g = new THREE.Group();
    g.position.copy(origin);
    parent.add(g);
    for (const side of [1, -1] as const) {
      const m = this.spike(
        g,
        V(o.length * 0.42, 0, side * o.spread),
        o.radius,
        o.length,
        V(0, 0, -Math.PI / 2),
        o.material ?? this.plateMat,
        4,
      );
      m.rotation.y = -side * 0.32;
      m.rotation.x = o.droop * side;
      const tipR = o.radius * (o.tip ?? 0.55);
      if (tipR > 0.001) {
        const tip = this.mesh(g, new THREE.IcosahedronGeometry(tipR, 0), o.tipMaterial ?? this.glowMat);
        tip.position.set(o.length * 0.92, -o.droop * 0.35, side * (o.spread + o.length * 0.14));
      }
    }
    return g;
  }

  // ----------------------------------------------------------------- finish

  finish(opts: {
    eyeL?: THREE.Mesh;
    eyeR?: THREE.Mesh;
    wingL?: THREE.Group | null;
    wingR?: THREE.Group | null;
    jawTop?: THREE.Group | null;
    jawBottom?: THREE.Group | null;
    tail?: THREE.Group | null;
  } = {}): CreatureRig {
    let { eyeL, eyeR } = opts;
    if (!eyeL || !eyeR) {
      // The rig type requires both; drones with a single optic just alias it.
      const fallback = this.mesh(this.head, new THREE.IcosahedronGeometry(0.02, 0), this.darkMat);
      fallback.visible = false;
      eyeL = eyeL ?? fallback;
      eyeR = eyeR ?? eyeL;
    }
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return {
      root: this.root,
      body: this.body,
      head: this.head,
      legs: this.legs,
      tail: opts.tail ?? null,
      wingL: opts.wingL ?? null,
      wingR: opts.wingR ?? null,
      eyeL,
      eyeR,
      mouth: opts.jawBottom ?? null,
      jawTop: opts.jawTop ?? null,
      jawBottom: opts.jawBottom ?? null,
      bodyBaseY: this.body.position.y,
      allMeshes: this.meshes,
    };
  }
}
