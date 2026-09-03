import * as THREE from 'three';

export type EarType = 'round' | 'pointy' | 'long' | 'flap' | 'none';
export type TailType = 'none' | 'short' | 'long' | 'fluffy' | 'spiked';
export type HornType = 'none' | 'single' | 'double' | 'antlers' | 'crest';

/** Quadruped (default) or an upright, anthropomorphic two-legged soldier. */
export type Stance = 'quad' | 'biped';
/** `dot` = the original tiny bead eyes. `cartoon` = big sclera + pupil + shine. */
export type FaceStyle = 'dot' | 'cartoon';
export type MouthStyle = 'default' | 'none' | 'beak' | 'trunk' | 'grin';

/**
 * Wearable kit. Accessories are what make a procedural blob read as a
 * *character with a job* at gameplay distance, so they are deliberately
 * oversized relative to real-world proportions.
 */
export type AccessoryType =
  | 'combat-helmet'
  | 'scout-cap'
  | 'bandana'
  | 'goggles'
  | 'visor'
  | 'headlamp'
  | 'antenna'
  | 'scarf'
  | 'neckerchief'
  | 'backpack'
  | 'satchel'
  | 'binoculars'
  | 'shoulder-pads'
  | 'chest-strap'
  | 'belt'
  | 'armor-plates'
  | 'armor-skirt'
  | 'howdah'
  | 'tusks'
  | 'war-paint'
  | 'cheek-blush'
  | 'boots'
  | 'cape'
  | 'ammo-pouch';

export interface AccessorySpec {
  type: AccessoryType;
  /** Main color of the item. Falls back to the creature's secondary color. */
  color?: number;
  /** Trim/lens/metal color. Falls back to the creature's accent color. */
  accent?: number;
  /** Uniform size multiplier for the item (1 = tuned default). */
  scale?: number;
  /** Extra local offset in creature units, applied after the default anchor. */
  offset?: [number, number, number];
}

export interface CreatureConfig {
  bodyColor: number;
  secondaryColor: number;
  accentColor: number;
  eyeColor: number;
  bodyLength: number;
  bodyRadius: number;
  bodyHeight?: number;
  legHeight: number;
  legRadius: number;
  legCount: 2 | 4 | 6;
  neckLength: number;
  headRadius: number;
  snoutLength: number;
  earType: EarType;
  tailType: TailType;
  hasWings: boolean;
  hornType: HornType;
  emissive: number;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
  scale: number;
  armored?: boolean;
  spikeCount?: number;

  // ---- cartoon / character extensions (all optional, all default to the
  // original look so existing configs keep rendering unchanged) ----

  /** Body plan. `biped` stands the torso upright and adds arms. */
  stance?: Stance;
  /** Exaggeration multiplier on head size — the #1 cartoon-proportion knob. */
  headScale?: number;
  /** Lighter underside / chest patch. Omit for no patch. */
  bellyColor?: number;
  /** Lighter muzzle / face mask patch. Omit for none. */
  muzzleColor?: number;
  /** Legs + arms color. Defaults to secondaryColor. */
  limbColor?: number;
  /** Feet/hand color. Defaults to limbColor darkened by the accent. */
  footColor?: number;
  earColor?: number;
  earScale?: number;
  /** Head sphere color, when the head should differ from the body. */
  headColor?: number;
  faceStyle?: FaceStyle;
  /** Eye size multiplier (cartoon faces are already ~2x the dot eyes). */
  eyeScale?: number;
  eyeWhiteColor?: number;
  pupilColor?: number;
  /** Brows give attitude. Omit to skip them. */
  browColor?: number;
  /** Positive = angry/determined, negative = worried. Radians. */
  browAngle?: number;
  mouthStyle?: MouthStyle;
  /** Squash/stretch on the torso: >1 taller, <1 flatter. */
  bodySquash?: number;
  hasArms?: boolean;
  armColor?: number;
  /** Arm swing, radians. Positive rotates the hands forward (+X). */
  armPose?: number;
  tailColor?: number;
  tailTipColor?: number;
  wingColor?: number;
  wingAltColor?: number;
  wingTipColor?: number;
  /** Two-tone quill tips for spikeCount fans. */
  spikeTipColor?: number;
  accessories?: AccessorySpec[];
}

export interface CreatureRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legs: THREE.Group[];
  tail: THREE.Group | null;
  wingL: THREE.Group | null;
  wingR: THREE.Group | null;
  eyeL: THREE.Mesh;
  eyeR: THREE.Mesh;
  mouth: THREE.Group | null;
  jawTop: THREE.Group | null;
  jawBottom: THREE.Group | null;
  bodyBaseY: number;
  allMeshes: THREE.Mesh[];
  /** Present only on `stance: 'biped'` creatures built with `hasArms`. */
  armL?: THREE.Group | null;
  armR?: THREE.Group | null;
}

export const DEFAULT_CREATURE: CreatureConfig = {
  bodyColor: 0xc47a3b,
  secondaryColor: 0x8a5326,
  accentColor: 0xffcf6b,
  eyeColor: 0x1a1a1a,
  bodyLength: 1.6,
  bodyRadius: 0.55,
  legHeight: 0.7,
  legRadius: 0.16,
  legCount: 4,
  neckLength: 0.3,
  headRadius: 0.42,
  snoutLength: 0.35,
  earType: 'round',
  tailType: 'short',
  hasWings: false,
  hornType: 'none',
  emissive: 0x000000,
  emissiveIntensity: 0,
  roughness: 0.75,
  metalness: 0.05,
  scale: 1,
};

/**
 * A strong emissiveIntensity applied uniformly across a large body surface
 * washes the base color out to a flat glow-color silhouette (e.g. a dark
 * purple alien reads as solid hot pink). Body/secondary materials only get a
 * fraction of the configured intensity so the base color still reads and the
 * glow feels like an accent rather than replacing the surface; accent parts
 * (horns, spikes, plates) can run a bit hotter since they're small details.
 */
function mat(color: number, cfg: CreatureConfig, extra?: Partial<THREE.MeshStandardMaterialParameters>, emissiveScale = 0.3) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: cfg.roughness,
    metalness: cfg.metalness,
    flatShading: true,
    emissive: cfg.emissive,
    emissiveIntensity: cfg.emissiveIntensity * emissiveScale,
    ...extra,
  });
}

function addMesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material, list: THREE.Mesh[]) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  const std = material as THREE.MeshStandardMaterial;
  if (std.emissive && material.userData.baseEmissiveHex === undefined) {
    material.userData.baseEmissiveHex = std.emissive.getHex();
    material.userData.baseEmissiveIntensity = std.emissiveIntensity;
  }
  parent.add(m);
  list.push(m);
  return m;
}

/**
 * Largest uniform scale that keeps a rig inside a cell-sized footprint.
 * Creature configs vary a lot in natural proportions, so an artistic `scale`
 * alone lets big units (the elephant, the boss) spill over their lane; this
 * clamps them to the grid so on-screen size always matches the space a unit
 * actually occupies.
 */
export function computeFitScale(root: THREE.Object3D, maxLength: number, maxHeight: number): number {
  const previous = root.scale.clone();
  root.scale.setScalar(1);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  root.scale.copy(previous);
  const size = box.getSize(new THREE.Vector3());
  const lengthScale = size.x > 0.0001 ? maxLength / size.x : 1;
  const heightScale = size.y > 0.0001 ? maxHeight / size.y : 1;
  return Math.min(lengthScale, heightScale);
}

/**
 * Builds a stylized low-poly creature from primitive geometry, grouped into a
 * hierarchy of named parts so gait/attack animation systems can drive it.
 *
 * Convention: creatures are modelled head-first along local +X (snout at +X,
 * tail at -X), standing on y = 0. Everything visual hangs off `body` or `head`
 * so the idle/attack/walk animations carry the whole character with them.
 */
export function buildCreature(cfg: Partial<CreatureConfig>): CreatureRig {
  const c: CreatureConfig = { ...DEFAULT_CREATURE, ...cfg };
  const allMeshes: THREE.Mesh[] = [];

  const root = new THREE.Group();

  // --- material palette (cached so repeated colors share one material and the
  // hit-flash pass touches each surface exactly once) ---
  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  const M = (color: number, extra?: Partial<THREE.MeshStandardMaterialParameters>, emissiveScale = 0.2) => {
    const key = `${color}|${JSON.stringify(extra ?? {})}|${emissiveScale}`;
    let m = matCache.get(key);
    if (!m) {
      m = mat(color, c, extra, emissiveScale);
      matCache.set(key, m);
    }
    return m;
  };

  const primaryMat = M(c.bodyColor, undefined, 0.1);
  const secondaryMat = M(c.secondaryColor, undefined, 0.14);
  const accentMat = M(c.accentColor, { roughness: 0.35, metalness: 0.2 }, 0.55);
  const limbMat = M(c.limbColor ?? c.secondaryColor, undefined, 0.14);
  const footMat = M(c.footColor ?? c.limbColor ?? c.secondaryColor, { roughness: 0.6 }, 0.14);
  const bellyMat = c.bellyColor !== undefined ? M(c.bellyColor, undefined, 0.1) : null;
  const muzzleMat = c.muzzleColor !== undefined ? M(c.muzzleColor, undefined, 0.1) : null;
  const metalMat = (color: number) => M(color, { roughness: 0.32, metalness: 0.45 }, 0.3);
  const clothMat = (color: number) => M(color, { roughness: 0.9, metalness: 0.0 }, 0.2);
  const glassMat = (color: number) =>
    M(color, { roughness: 0.15, metalness: 0.1, emissive: color, emissiveIntensity: 0.55 }, 0);

  const eyeMat = new THREE.MeshStandardMaterial({ color: c.eyeColor, roughness: 0.2, metalness: 0.1 });
  const eyeGlowMat = c.emissiveIntensity > 0
    ? new THREE.MeshStandardMaterial({ color: c.accentColor, emissive: c.accentColor, emissiveIntensity: 2.2, roughness: 0.3 })
    : eyeMat;

  const isBiped = (c.stance ?? 'quad') === 'biped';
  const hr = c.headRadius * (c.headScale ?? 1);
  const squash = c.bodySquash ?? 1;
  const bodyBaseY = c.legHeight;
  // THREE.CapsuleGeometry(radius, length) is `length` PLUS two hemispherical
  // caps, so the real half-extent along the capsule's long axis is this — not
  // bodyLength/2. Laying parts out against bodyLength alone is what made the
  // old creatures long low lozenges with their legs bunched in the middle.
  const capHalf = c.bodyLength * 0.5 + c.bodyRadius;
  /** Half-extent forward (+X) / back (-X) of the torso. */
  const halfX = isBiped ? c.bodyRadius : capHalf;
  /** Half-extent above the torso center. */
  const topY = (isBiped ? capHalf : c.bodyRadius) * squash;
  const frontX = halfX;
  const backX = -halfX;

  // ---------------------------------------------------------------- legs ---
  const legs: THREE.Group[] = [];
  const buildLeg = (x: number, z: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(x, bodyBaseY, z);
    const upperGeo = new THREE.CapsuleGeometry(c.legRadius, c.legHeight * 0.55, 2, 6);
    const upper = addMesh(legGroup, upperGeo, limbMat, allMeshes);
    upper.position.y = -c.legHeight * 0.3;
    // Chunky forward-facing foot: elongated along +X so the character reads as
    // planted and facing down its lane in side profile.
    const footGeo = new THREE.SphereGeometry(c.legRadius * 1.2, 6, 5);
    const foot = addMesh(legGroup, footGeo, footMat, allMeshes);
    foot.position.set(c.legRadius * 0.35, -c.legHeight * 0.62, 0);
    foot.scale.set(1.6, 0.62, 1.15);
    root.add(legGroup);
    legs.push(legGroup);
    return legGroup;
  };

  if (isBiped) {
    buildLeg(0, c.bodyRadius * 0.55);
    buildLeg(0, -c.bodyRadius * 0.55);
  } else {
    const legPositionsX = c.legCount === 2 ? [0] : [capHalf * 0.6, -capHalf * 0.62];
    const legPositionsZ = c.legCount === 2 ? [0] : [c.bodyRadius * 0.6, -c.bodyRadius * 0.6];
    for (const x of legPositionsX) for (const z of legPositionsZ) buildLeg(x, z);
    if (c.legCount === 2) {
      // duplicate for a believable biped stance (slightly apart)
      legs[0].position.z = 0.18;
      const clone = legs[0].clone();
      clone.position.z = -0.18;
      root.add(clone);
      legs.push(clone);
    }
  }

  // ---------------------------------------------------------------- body ---
  const body = new THREE.Group();
  body.position.y = isBiped ? bodyBaseY + capHalf * squash * 0.86 : bodyBaseY + c.bodyRadius * 0.55;
  root.add(body);

  const bodyGeo = new THREE.CapsuleGeometry(c.bodyRadius, c.bodyLength, 3, 9);
  const bodyMesh = addMesh(body, bodyGeo, primaryMat, allMeshes);
  if (isBiped) {
    bodyMesh.scale.set(1, squash, c.bodyHeight ?? 0.92);
  } else {
    bodyMesh.rotation.z = Math.PI / 2;
    bodyMesh.scale.set(1, squash, c.bodyHeight ?? 1);
  }

  // belly / chest patch — a big light shape on the front is the cheapest,
  // strongest "cartoon character" cue there is.
  if (bellyMat) {
    const bellyGeo = new THREE.SphereGeometry(1, 8, 7);
    const belly = addMesh(body, bellyGeo, bellyMat, allMeshes);
    if (isBiped) {
      belly.position.set(c.bodyRadius * 0.34, -capHalf * 0.06, 0);
      belly.scale.set(c.bodyRadius * 0.72, capHalf * 0.74 * squash, c.bodyRadius * 0.92);
    } else {
      belly.position.set(capHalf * 0.06, -c.bodyRadius * 0.4, 0);
      belly.scale.set(capHalf * 0.78, c.bodyRadius * 0.66 * squash, c.bodyRadius * 0.9);
    }
  }

  if (c.armored) {
    // BoxGeometry args are (width=X, height=Y, depth=Z). Body length runs
    // along X and body width along Z, so this previously had X/Z swapped —
    // the plate was a short-but-very-wide slab running crosswise (often
    // wider than the body itself), reading as a detached floating cube
    // rather than a saddle of armor along the spine. Run it along X instead,
    // keep it narrower than the body diameter so it hugs the curve, and sink
    // it in a bit further so it reads as plating on the body, not a block
    // resting on top of it.
    const plateGeo = new THREE.BoxGeometry(capHalf * 0.95, c.bodyRadius * 0.4, c.bodyRadius * 1.3);
    const plate = addMesh(body, plateGeo, accentMat, allMeshes);
    plate.position.y = c.bodyRadius * 0.68;
  }

  if (c.spikeCount) {
    // Quill fan: three staggered rows of two-tone cones swept back over the
    // spine. Anchored on the actual capsule surface (cone half-height is a
    // fixed world size, so anchoring on a fraction of bodyRadius used to bury
    // them inside the body) and tipped in a contrasting color so the "these
    // are my ammunition" read survives at gameplay distance.
    const tipMat = M(c.spikeTipColor ?? c.accentColor, { roughness: 0.4 }, 0.55);
    const rows = c.spikeCount > 6 ? [0.55, 0, -0.55] : [0];
    const perRow = Math.max(2, Math.round(c.spikeCount / rows.length));
    for (let r = 0; r < rows.length; r++) {
      const zf = rows[r];
      for (let i = 0; i < perRow; i++) {
        const t = perRow === 1 ? 0 : (i / (perRow - 1)) * 2 - 1;
        const lenScale = (1 - Math.abs(zf) * 0.25) * (1 - Math.abs(t) * 0.28);
        const spikeH = 0.95 * lenScale;
        const g = new THREE.Group();
        body.add(g);
        const surfaceY = Math.sqrt(Math.max(0.05, 1 - zf * zf)) * c.bodyRadius;
        g.position.set(t * capHalf * 0.62, surfaceY * 0.92, zf * c.bodyRadius * 0.92);
        g.rotation.z = 0.55 + Math.abs(t) * 0.35 * Math.sign(t);
        g.rotation.x = -zf * 0.75;
        const base = addMesh(g, new THREE.ConeGeometry(0.105, spikeH, 5), secondaryMat, allMeshes);
        base.position.y = spikeH * 0.45;
        const tip = addMesh(g, new THREE.ConeGeometry(0.078, spikeH * 0.55, 5), tipMat, allMeshes);
        tip.position.y = spikeH * 0.92;
      }
    }
  }

  // ---------------------------------------------------------------- tail ---
  let tail: THREE.Group | null = null;
  const tailMat = c.tailColor !== undefined ? M(c.tailColor, undefined, 0.14) : secondaryMat;
  const tailTipMat = c.tailTipColor !== undefined ? M(c.tailTipColor, undefined, 0.2) : accentMat;
  if (c.tailType !== 'none') {
    tail = new THREE.Group();
    tail.position.set(
      isBiped ? -c.bodyRadius * 0.72 : -capHalf * 0.9,
      isBiped ? -capHalf * 0.42 : 0,
      0,
    );
    if (isBiped) tail.rotation.z = 0.85;
    body.add(tail);
    if (c.tailType === 'fluffy') {
      const tuftGeo = new THREE.SphereGeometry(0.22, 6, 6);
      const tuft = addMesh(tail, tuftGeo, tailMat, allMeshes);
      tuft.position.x = -0.35;
      const baseGeo = new THREE.CapsuleGeometry(0.07, 0.35, 2, 5);
      const base = addMesh(tail, baseGeo, primaryMat, allMeshes);
      base.rotation.z = Math.PI / 2;
      base.position.x = -0.15;
    } else if (c.tailType === 'spiked') {
      const len = 0.7;
      const baseGeo = new THREE.ConeGeometry(0.14, len, 6);
      const base = addMesh(tail, baseGeo, tailMat, allMeshes);
      base.rotation.z = Math.PI / 2;
      base.position.x = -len / 2;
    } else {
      const len = c.tailType === 'long' ? (isBiped ? 0.62 : 0.9) : 0.4;
      const baseGeo = new THREE.CapsuleGeometry(0.078, len, 2, 6);
      const base = addMesh(tail, baseGeo, tailMat, allMeshes);
      base.rotation.z = Math.PI / 2;
      base.position.x = -len / 2;
      if (c.tailType === 'long') {
        // banded tip so a long tail still reads as a shape, not a stick
        const tipGeo = new THREE.SphereGeometry(0.1, 6, 6);
        const tip = addMesh(tail, tipGeo, tailTipMat, allMeshes);
        tip.position.x = -len - 0.02;
        tip.scale.set(1.25, 1, 1);
      }
    }
  }

  // --------------------------------------------------------------- wings ---
  let wingL: THREE.Group | null = null;
  let wingR: THREE.Group | null = null;
  if (c.hasWings) {
    // A laterally-extended wing is almost entirely foreshortened by the game's
    // high three-quarter camera, so wings are posed *mantled*: a fan of long
    // feathers raised above the shoulder and swept back, tilted outward. That
    // fills vertical screen space, so "this one flies" reads instantly.
    const featherA = c.wingColor !== undefined ? M(c.wingColor, undefined, 0.14) : secondaryMat;
    const featherB = c.wingAltColor !== undefined ? M(c.wingAltColor, undefined, 0.14) : primaryMat;
    const featherTipMat = c.wingTipColor !== undefined ? M(c.wingTipColor, { roughness: 0.4 }, 0.4) : accentMat;
    const makeWing = (sign: number) => {
      const w = new THREE.Group();
      w.position.set(
        isBiped ? -c.bodyRadius * 0.1 : -capHalf * 0.16,
        isBiped ? topY * 0.55 : c.bodyRadius * 0.5,
        sign * c.bodyRadius * 0.8,
      );
      const inner = new THREE.Group();
      inner.rotation.x = -sign * 0.42;
      w.add(inner);

      const joint = addMesh(inner, new THREE.SphereGeometry(c.bodyRadius * 0.42, 7, 5), featherB, allMeshes);
      joint.scale.set(1.1, 0.9, 1.05);

      const feathers = 4;
      for (let i = 0; i < feathers; i++) {
        const fg = new THREE.Group();
        inner.add(fg);
        fg.rotation.z = 0.02 + i * 0.34;
        fg.rotation.y = sign * i * 0.12;
        const L = c.bodyLength * (1.35 - i * 0.13);
        const f = addMesh(
          fg,
          new THREE.BoxGeometry(c.bodyLength * 0.19, L, c.bodyLength * 0.15),
          i % 2 === 0 ? featherA : featherB,
          allMeshes,
        );
        f.position.set(0, L * 0.5, sign * i * c.bodyLength * 0.07);
        const tip = addMesh(fg, new THREE.ConeGeometry(c.bodyLength * 0.12, c.bodyLength * 0.24, 4), featherTipMat, allMeshes);
        tip.position.set(0, L, sign * i * c.bodyLength * 0.07);
      }
      return w;
    };
    wingL = makeWing(1);
    wingR = makeWing(-1);
    body.add(wingL, wingR);
  }

  // ----------------------------------------------------------- neck + head ---
  const head = new THREE.Group();
  if (isBiped) {
    head.position.set(hr * 0.12, topY * 0.95 + c.neckLength + hr * 0.5, 0);
  } else {
    head.position.set(capHalf * 0.86 + c.neckLength + hr * 0.32, c.bodyRadius * 0.32 + hr * 0.2, 0);
  }
  body.add(head);

  if (c.neckLength > 0.05) {
    const neckGeo = new THREE.CapsuleGeometry(c.bodyRadius * (isBiped ? 0.42 : 0.5), c.neckLength, 2, 6);
    const neck = addMesh(body, neckGeo, primaryMat, allMeshes);
    if (isBiped) {
      neck.position.set(hr * 0.06, topY * 0.9, 0);
    } else {
      neck.rotation.z = Math.PI / 2 - 0.6;
      neck.position.set(capHalf * 0.74, c.bodyRadius * 0.22 + c.neckLength * 0.4, 0);
    }
  }

  const headMat = c.headColor !== undefined ? M(c.headColor, undefined, 0.1) : primaryMat;
  const headGeo = new THREE.SphereGeometry(hr, 9, 8);
  const headMesh = addMesh(head, headGeo, headMat, allMeshes);
  headMesh.scale.set(1, 0.97, 1);

  // face mask / muzzle patch
  if (muzzleMat) {
    const patch = addMesh(head, new THREE.SphereGeometry(hr * 0.66, 8, 7), muzzleMat, allMeshes);
    patch.position.set(hr * 0.52, -hr * 0.14, 0);
    patch.scale.set(0.72, 0.78, 0.92);
  }

  // snout / jaw / beak
  let jawTop: THREE.Group | null = null;
  let jawBottom: THREE.Group | null = null;
  let mouth: THREE.Group | null = null;
  const mouthStyle: MouthStyle = c.mouthStyle ?? 'default';

  if (mouthStyle === 'beak') {
    jawTop = new THREE.Group();
    jawTop.position.set(hr * 0.72, hr * 0.02, 0);
    head.add(jawTop);
    const upper = addMesh(jawTop, new THREE.ConeGeometry(hr * 0.42, c.snoutLength * 1.5, 6), accentMat, allMeshes);
    upper.rotation.z = -Math.PI / 2;
    upper.position.set(c.snoutLength * 0.7, 0.02, 0);
    upper.scale.set(1, 1, 0.82);
    // hooked tip
    const hook = addMesh(jawTop, new THREE.ConeGeometry(hr * 0.15, hr * 0.34, 5), accentMat, allMeshes);
    hook.position.set(c.snoutLength * 1.34, -hr * 0.09, 0);
    hook.rotation.z = Math.PI;

    jawBottom = new THREE.Group();
    jawBottom.position.set(hr * 0.66, -hr * 0.14, 0);
    head.add(jawBottom);
    const lower = addMesh(jawBottom, new THREE.ConeGeometry(hr * 0.3, c.snoutLength * 1.05, 5), accentMat, allMeshes);
    lower.rotation.z = -Math.PI / 2;
    lower.position.set(c.snoutLength * 0.5, -hr * 0.06, 0);
    lower.scale.set(1, 0.62, 0.72);
    mouth = jawBottom;
  } else if (mouthStyle === 'trunk') {
    jawTop = new THREE.Group();
    jawTop.position.set(hr * 0.55, -hr * 0.12, 0);
    head.add(jawTop);
    // segmented, tapering, curling trunk
    let px = 0;
    let py = 0;
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const t = i / (segs - 1);
      const r = hr * (0.34 - t * 0.16);
      const segLen = c.snoutLength * 0.42;
      const seg = addMesh(jawTop, new THREE.CapsuleGeometry(r, segLen, 2, 6), secondaryMat, allMeshes);
      const ang = -0.15 - t * 0.85;
      seg.rotation.z = -Math.PI / 2 + ang;
      px += Math.cos(ang) * segLen * 0.78;
      py += Math.sin(ang) * segLen * 0.78;
      seg.position.set(px, py, 0);
    }
    jawBottom = new THREE.Group();
    jawBottom.position.set(hr * 0.5, -hr * 0.45, 0);
    head.add(jawBottom);
    const lip = addMesh(jawBottom, new THREE.SphereGeometry(hr * 0.3, 6, 5), secondaryMat, allMeshes);
    lip.scale.set(1.1, 0.55, 1.0);
    mouth = jawBottom;
  } else if (mouthStyle === 'grin') {
    jawTop = new THREE.Group();
    jawTop.position.set(hr * 0.62, -hr * 0.02, 0);
    head.add(jawTop);
    jawBottom = new THREE.Group();
    jawBottom.position.set(hr * 0.5, -hr * 0.3, 0);
    head.add(jawBottom);
    const grin = addMesh(jawBottom, new THREE.BoxGeometry(hr * 0.14, hr * 0.2, hr * 0.7), M(0x2a1a16, undefined, 0), allMeshes);
    grin.position.set(hr * 0.42, 0, 0);
    const teeth = addMesh(jawBottom, new THREE.BoxGeometry(hr * 0.1, hr * 0.1, hr * 0.6), M(0xfff6e0, undefined, 0), allMeshes);
    teeth.position.set(hr * 0.46, hr * 0.07, 0);
    mouth = jawBottom;
  } else if (mouthStyle !== 'none' && c.snoutLength > 0.01) {
    jawTop = new THREE.Group();
    jawTop.position.set(hr * 0.7, 0.02, 0);
    head.add(jawTop);
    const snoutGeo = new THREE.CapsuleGeometry(hr * 0.4, c.snoutLength, 2, 6);
    const snout = addMesh(jawTop, snoutGeo, muzzleMat ?? secondaryMat, allMeshes);
    snout.rotation.z = Math.PI / 2;
    snout.position.x = c.snoutLength * 0.5;
    // nose button — tiny, but it lands right on the silhouette tip
    const nose = addMesh(jawTop, new THREE.SphereGeometry(hr * 0.17, 6, 5), M(0x2b1c18, undefined, 0), allMeshes);
    nose.position.set(c.snoutLength + hr * 0.28, hr * 0.06, 0);

    jawBottom = new THREE.Group();
    jawBottom.position.set(hr * 0.6, -hr * 0.25, 0);
    head.add(jawBottom);
    const jawGeo = new THREE.CapsuleGeometry(hr * 0.28, c.snoutLength * 0.85, 2, 5);
    const jawMesh = addMesh(jawBottom, jawGeo, muzzleMat ?? secondaryMat, allMeshes);
    jawMesh.rotation.z = Math.PI / 2;
    jawMesh.position.x = c.snoutLength * 0.4;
    mouth = jawBottom;
  }

  // ---------------------------------------------------------------- eyes ---
  let eyeL: THREE.Mesh;
  let eyeR: THREE.Mesh;
  const eyeScale = c.eyeScale ?? 1;
  if ((c.faceStyle ?? 'dot') === 'cartoon') {
    const whiteMat = M(c.eyeWhiteColor ?? 0xfdf6ea, { roughness: 0.35, metalness: 0 }, 0);
    const pupilMat = M(c.pupilColor ?? c.eyeColor, { roughness: 0.2 }, 0);
    const shineMat = M(0xffffff, { roughness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.35 }, 0);
    const rEye = hr * 0.34 * eyeScale;
    const makeEye = (sign: number) => {
      // The gameplay camera sits ~25 degrees behind the pure side view, so
      // eyes flush with the front of the skull are barely visible. Pushing
      // them outboard until they bulge past the head silhouette both reads
      // from that angle and is the classic cartoon proportion anyway.
      const sclera = addMesh(head, new THREE.SphereGeometry(rEye, 8, 7), whiteMat, allMeshes);
      sclera.position.set(hr * 0.56, hr * 0.26, sign * hr * 0.6);
      sclera.scale.set(0.88, 1, 0.95);
      const pupil = addMesh(sclera, new THREE.SphereGeometry(rEye * 0.58, 7, 6), pupilMat, allMeshes);
      pupil.position.set(rEye * 0.5, 0, sign * rEye * 0.42);
      pupil.scale.set(0.85, 1, 0.85);
      const shine = addMesh(pupil, new THREE.SphereGeometry(rEye * 0.22, 5, 4), shineMat, allMeshes);
      shine.position.set(rEye * 0.42, rEye * 0.3, sign * rEye * 0.2);
      return sclera;
    };
    eyeL = makeEye(1);
    eyeR = makeEye(-1);

    if (c.browColor !== undefined) {
      const browMat = M(c.browColor, undefined, 0.1);
      const angle = c.browAngle ?? 0.35;
      for (const sign of [1, -1]) {
        const brow = addMesh(head, new THREE.BoxGeometry(hr * 0.34, hr * 0.15, hr * 0.42), browMat, allMeshes);
        brow.position.set(hr * 0.58, hr * 0.26 + rEye * 1.05, sign * hr * 0.6);
        brow.rotation.x = sign * angle;
        brow.rotation.z = -0.22;
        brow.scale.set(1, 1, 1.2);
      }
    }
  } else {
    const eyeGeo = new THREE.SphereGeometry(hr * 0.18 * eyeScale, 6, 6);
    eyeL = addMesh(head, eyeGeo, eyeGlowMat, allMeshes);
    eyeL.position.set(hr * 0.55, hr * 0.25, hr * 0.45);
    eyeR = addMesh(head, eyeGeo, eyeGlowMat, allMeshes);
    eyeR.position.set(hr * 0.55, hr * 0.25, -hr * 0.45);
  }

  // ---------------------------------------------------------------- ears ---
  if (c.earType !== 'none') {
    const earMat = c.earColor !== undefined ? M(c.earColor, undefined, 0.14) : secondaryMat;
    const es = c.earScale ?? 1;
    const makeEar = (sign: number) => {
      let earGeo: THREE.BufferGeometry;
      if (c.earType === 'flap') {
        // Big flat fan ears (elephant): a squashed cylinder disc hung off the
        // side of the skull, angled back so it reads in side profile.
        earGeo = new THREE.CylinderGeometry(hr * 0.85 * es, hr * 0.72 * es, hr * 0.14, 7);
        const flap = addMesh(head, earGeo, earMat, allMeshes);
        flap.position.set(-hr * 0.42, hr * 0.18, sign * hr * 0.78);
        flap.rotation.x = Math.PI / 2;
        flap.rotation.z = -0.3;
        flap.scale.set(0.92, 1, 1.15);
        return flap;
      }
      if (c.earType === 'long') earGeo = new THREE.ConeGeometry(hr * 0.28 * es, hr * 1.4 * es, 5);
      else if (c.earType === 'pointy') earGeo = new THREE.ConeGeometry(hr * 0.32 * es, hr * 0.7 * es, 4);
      else earGeo = new THREE.SphereGeometry(hr * 0.32 * es, 6, 5);
      const ear = addMesh(head, earGeo, earMat, allMeshes);
      ear.position.set(-hr * 0.1, hr * 0.75, sign * hr * 0.55);
      ear.rotation.z = -sign * 0.2;
      ear.scale.setScalar(1);
      return ear;
    };
    makeEar(1);
    makeEar(-1);
  }

  // --------------------------------------------------------------- horns ---
  if (c.hornType !== 'none') {
    if (c.hornType === 'single') {
      const hornGeo = new THREE.ConeGeometry(hr * 0.26, hr * 1.6, 6);
      const horn = addMesh(head, hornGeo, accentMat, allMeshes);
      horn.position.set(hr * 1.0, hr * 0.3, 0);
      horn.rotation.z = Math.PI / 2 - 0.75;
      // small secondary horn behind it
      const horn2 = addMesh(head, new THREE.ConeGeometry(hr * 0.13, hr * 0.5, 5), accentMat, allMeshes);
      horn2.position.set(hr * 0.42, hr * 0.62, 0);
      horn2.rotation.z = -0.35;
    } else if (c.hornType === 'double') {
      for (const sign of [1, -1]) {
        const hornGeo = new THREE.ConeGeometry(hr * 0.12, hr * 0.8, 5);
        const horn = addMesh(head, hornGeo, accentMat, allMeshes);
        horn.position.set(hr * 0.2, hr * 0.85, sign * hr * 0.4);
        horn.rotation.z = 0.5;
        horn.rotation.x = sign * 0.4;
      }
    } else if (c.hornType === 'antlers') {
      for (const sign of [1, -1]) {
        const g = new THREE.Group();
        g.position.set(0, hr * 0.8, sign * hr * 0.3);
        head.add(g);
        for (let i = 0; i < 3; i++) {
          const tineGeo = new THREE.ConeGeometry(0.03, 0.35 - i * 0.08, 4);
          const tine = addMesh(g, tineGeo, accentMat, allMeshes);
          tine.position.set(i * 0.06, 0.15 + i * 0.12, sign * i * 0.08);
          tine.rotation.z = 0.3;
        }
      }
    } else if (c.hornType === 'crest') {
      const crestGeo = new THREE.ConeGeometry(hr * 0.5, hr * 0.9, 4);
      const crest = addMesh(head, crestGeo, accentMat, allMeshes);
      crest.position.set(-hr * 0.1, hr * 0.85, 0);
      crest.scale.set(0.3, 1, 1);
    }
  }

  // ---------------------------------------------------------------- arms ---
  let armL: THREE.Group | null = null;
  let armR: THREE.Group | null = null;
  if (c.hasArms) {
    const armMat = M(c.armColor ?? c.limbColor ?? c.secondaryColor, undefined, 0.14);
    const handMat = M(c.footColor ?? c.armColor ?? c.limbColor ?? c.secondaryColor, undefined, 0.14);
    const armLen = c.bodyLength * (isBiped ? 0.44 : 0.34) + c.bodyRadius * 0.3;
    const armR0 = c.legRadius * 0.92;
    const makeArm = (sign: number) => {
      const g = new THREE.Group();
      g.position.set(
        isBiped ? c.bodyRadius * 0.1 : capHalf * 0.48,
        isBiped ? topY * 0.6 : c.bodyRadius * 0.35,
        sign * c.bodyRadius * 0.95,
      );
      g.rotation.z = -(c.armPose ?? 0.5);
      g.rotation.x = -sign * 0.22;
      const upper = addMesh(g, new THREE.CapsuleGeometry(armR0, armLen * 0.75, 2, 6), armMat, allMeshes);
      upper.position.y = -armLen * 0.45;
      const hand = addMesh(g, new THREE.SphereGeometry(armR0 * 1.35, 6, 5), handMat, allMeshes);
      hand.position.y = -armLen * 0.92;
      hand.scale.set(1, 0.95, 1.05);
      body.add(g);
      return g;
    };
    armL = makeArm(1);
    armR = makeArm(-1);
  }

  // --------------------------------------------------------- accessories ---
  const applyAccessory = (spec: AccessorySpec) => {
    const col = spec.color ?? c.secondaryColor;
    const acc = spec.accent ?? c.accentColor;
    const s = spec.scale ?? 1;
    const off = spec.offset ?? [0, 0, 0];
    const cm = clothMat(col);
    const mm = metalMat(col);
    const am = metalMat(acc);
    const place = (o: THREE.Object3D) => o.position.set(o.position.x + off[0], o.position.y + off[1], o.position.z + off[2]);

    switch (spec.type) {
      case 'combat-helmet': {
        const g = new THREE.Group();
        head.add(g);
        g.position.set(-hr * 0.05, hr * 0.28, 0);
        place(g);
        g.scale.setScalar(s);
        const dome = addMesh(g, new THREE.SphereGeometry(hr * 1.06, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.62), mm, allMeshes);
        dome.scale.set(1.02, 1.0, 1.06);
        // rim band all the way around
        const rim = addMesh(g, new THREE.CylinderGeometry(hr * 1.1, hr * 1.14, hr * 0.2, 12, 1, true), am, allMeshes);
        rim.position.y = -hr * 0.03;
        rim.scale.set(1.02, 1, 1.06);
        // forward brow guard
        const brim = addMesh(g, new THREE.BoxGeometry(hr * 0.5, hr * 0.16, hr * 1.5), am, allMeshes);
        brim.position.set(hr * 0.9, -hr * 0.04, 0);
        brim.rotation.z = 0.18;
        // crest fin along the spine of the helmet
        const crest = addMesh(g, new THREE.BoxGeometry(hr * 1.7, hr * 0.42, hr * 0.16), am, allMeshes);
        crest.position.set(0, hr * 0.72, 0);
        crest.rotation.z = 0.0;
        break;
      }
      case 'scout-cap': {
        const g = new THREE.Group();
        head.add(g);
        g.position.set(-hr * 0.04, hr * 0.66, 0);
        place(g);
        g.scale.setScalar(s);
        const dome = addMesh(g, new THREE.SphereGeometry(hr * 0.82, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.62), cm, allMeshes);
        dome.scale.set(1.02, 0.8, 1.02);
        const brim = addMesh(g, new THREE.CylinderGeometry(hr * 0.55, hr * 0.55, hr * 0.09, 10, 1, false, -Math.PI / 2, Math.PI), cm, allMeshes);
        brim.position.set(hr * 0.42, hr * 0.02, 0);
        brim.rotation.z = 0.12;
        brim.scale.set(1.15, 1, 0.95);
        const button = addMesh(g, new THREE.SphereGeometry(hr * 0.14, 6, 5), am, allMeshes);
        button.position.y = hr * 0.42;
        break;
      }
      case 'bandana': {
        const g = new THREE.Group();
        head.add(g);
        g.position.set(-hr * 0.02, hr * 0.42, 0);
        place(g);
        g.scale.setScalar(s);
        const band = addMesh(g, new THREE.CylinderGeometry(hr * 1.02, hr * 1.02, hr * 0.42, 10, 1, true), cm, allMeshes);
        band.scale.set(1, 1, 1.02);
        for (const sign of [1, -1]) {
          const tip = addMesh(g, new THREE.ConeGeometry(hr * 0.16, hr * 0.9, 4), cm, allMeshes);
          tip.position.set(-hr * 0.95, -hr * 0.1, sign * hr * 0.28);
          tip.rotation.z = Math.PI / 2 + 0.45;
          tip.rotation.y = sign * 0.3;
        }
        break;
      }
      case 'goggles': {
        const g = new THREE.Group();
        head.add(g);
        // Worn pushed up on the brow: keeps the big cartoon eyes visible while
        // still reading as flight/welding gear at gameplay distance.
        g.position.set(-hr * 0.05, hr * 0.74, 0);
        place(g);
        g.scale.setScalar(s);
        const strap = addMesh(g, new THREE.CylinderGeometry(hr * 0.96, hr * 0.96, hr * 0.3, 10, 1, true), cm, allMeshes);
        strap.rotation.x = Math.PI / 2;
        strap.scale.set(1, 1, 0.98);
        for (const sign of [1, -1]) {
          const rim2 = addMesh(g, new THREE.CylinderGeometry(hr * 0.36, hr * 0.36, hr * 0.3, 9), mm, allMeshes);
          rim2.rotation.z = Math.PI / 2;
          rim2.rotation.y = -sign * 0.12;
          rim2.position.set(hr * 0.56, hr * 0.02, sign * hr * 0.4);
          const lens = addMesh(g, new THREE.CylinderGeometry(hr * 0.26, hr * 0.26, hr * 0.14, 9), glassMat(acc), allMeshes);
          lens.rotation.z = Math.PI / 2;
          lens.rotation.y = -sign * 0.12;
          lens.position.set(hr * 0.74, hr * 0.02, sign * hr * 0.42);
        }
        break;
      }
      case 'visor': {
        const g = new THREE.Group();
        head.add(g);
        g.position.set(hr * 0.62, hr * 0.26, 0);
        place(g);
        g.scale.setScalar(s);
        const v = addMesh(g, new THREE.BoxGeometry(hr * 0.2, hr * 0.38, hr * 1.5), glassMat(acc), allMeshes);
        v.rotation.z = 0.12;
        break;
      }
      case 'headlamp': {
        const g = new THREE.Group();
        head.add(g);
        g.position.set(hr * 0.55, hr * 0.75, 0);
        place(g);
        g.scale.setScalar(s);
        const can = addMesh(g, new THREE.CylinderGeometry(hr * 0.24, hr * 0.28, hr * 0.34, 8), mm, allMeshes);
        can.rotation.z = -Math.PI / 2 + 0.25;
        const lens = addMesh(g, new THREE.CylinderGeometry(hr * 0.22, hr * 0.22, hr * 0.08, 8), glassMat(acc), allMeshes);
        lens.rotation.z = -Math.PI / 2 + 0.25;
        lens.position.set(hr * 0.2, hr * 0.05, 0);
        break;
      }
      case 'antenna': {
        const g = new THREE.Group();
        head.add(g);
        g.position.set(-hr * 0.35, hr * 0.75, hr * 0.3);
        place(g);
        g.scale.setScalar(s);
        const rod = addMesh(g, new THREE.CylinderGeometry(hr * 0.05, hr * 0.06, hr * 1.5, 5), mm, allMeshes);
        rod.position.y = hr * 0.75;
        rod.rotation.z = -0.22;
        const ball = addMesh(g, new THREE.SphereGeometry(hr * 0.16, 6, 5), am, allMeshes);
        ball.position.set(-hr * 0.32, hr * 1.5, 0);
        break;
      }
      case 'scarf': {
        const g = new THREE.Group();
        body.add(g);
        g.position.set(
          isBiped ? hr * 0.05 : capHalf * 0.72,
          isBiped ? topY + c.bodyRadius * 0.28 : c.bodyRadius * 0.42,
          0,
        );
        place(g);
        g.scale.setScalar(s);
        const ring = addMesh(g, new THREE.CylinderGeometry(hr * 0.78, hr * 0.9, hr * 0.55, 10), cm, allMeshes);
        ring.scale.set(1.05, 1, 1.1);
        // trailing tail streaming back over the shoulder
        for (let i = 0; i < 3; i++) {
          const seg = addMesh(g, new THREE.BoxGeometry(hr * 0.7, hr * 0.16, hr * (0.85 - i * 0.16)), cm, allMeshes);
          seg.position.set(-hr * (0.68 + i * 0.6), hr * (0.05 - i * 0.22), hr * 0.12 * i);
          seg.rotation.z = -0.22 - i * 0.2;
          seg.rotation.y = i * 0.16;
        }
        break;
      }
      case 'neckerchief': {
        const g = new THREE.Group();
        body.add(g);
        g.position.set(
          isBiped ? c.bodyRadius * 0.32 : capHalf * 0.68,
          isBiped ? topY * 0.92 : c.bodyRadius * 0.5,
          0,
        );
        place(g);
        g.scale.setScalar(s);
        const ring = addMesh(g, new THREE.CylinderGeometry(hr * 0.7, hr * 0.78, hr * 0.34, 10), cm, allMeshes);
        const flap = addMesh(g, new THREE.ConeGeometry(hr * 0.55, hr * 0.85, 4), cm, allMeshes);
        flap.position.set(hr * 0.28, -hr * 0.5, 0);
        flap.rotation.z = Math.PI;
        flap.rotation.y = Math.PI / 4;
        flap.scale.set(0.6, 1, 1);
        break;
      }
      case 'backpack': {
        const g = new THREE.Group();
        body.add(g);
        g.position.set(backX * 0.62, topY * 0.42, 0);
        place(g);
        g.scale.setScalar(s);
        const pack = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 0.8, c.bodyRadius * 1.1, c.bodyRadius * 1.35), cm, allMeshes);
        pack.rotation.z = isBiped ? 0 : 0.18;
        const flapM = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 0.86, c.bodyRadius * 0.3, c.bodyRadius * 1.42), am, allMeshes);
        flapM.position.y = c.bodyRadius * 0.5;
        flapM.rotation.z = isBiped ? 0 : 0.18;
        // bedroll strapped on top
        const roll = addMesh(g, new THREE.CylinderGeometry(c.bodyRadius * 0.24, c.bodyRadius * 0.24, c.bodyRadius * 1.4, 8), am, allMeshes);
        roll.rotation.x = Math.PI / 2;
        roll.position.set(-c.bodyRadius * 0.05, c.bodyRadius * 0.78, 0);
        break;
      }
      case 'satchel': {
        const g = new THREE.Group();
        body.add(g);
        g.position.set(isBiped ? -c.bodyRadius * 0.3 : -capHalf * 0.18, isBiped ? -capHalf * 0.26 : -c.bodyRadius * 0.1, c.bodyRadius * 1.12);
        place(g);
        g.scale.setScalar(s);
        const bag = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 0.85, c.bodyRadius * 0.75, c.bodyRadius * 0.4), cm, allMeshes);
        const lid = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 0.9, c.bodyRadius * 0.26, c.bodyRadius * 0.46), am, allMeshes);
        lid.position.y = c.bodyRadius * 0.3;
        // shoulder strap crossing the chest
        const strap = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 0.22, c.bodyRadius * 1.7, c.bodyRadius * 0.14), am, allMeshes);
        strap.position.set(c.bodyRadius * 0.25, c.bodyRadius * 0.85, -c.bodyRadius * 0.5);
        strap.rotation.z = -0.35;
        strap.rotation.x = 0.5;
        break;
      }
      case 'binoculars': {
        const g = new THREE.Group();
        body.add(g);
        g.position.set(
          isBiped ? c.bodyRadius * 0.75 : capHalf * 0.5,
          isBiped ? capHalf * 0.24 * squash : c.bodyRadius * 0.15,
          0,
        );
        place(g);
        g.scale.setScalar(s);
        for (const sign of [1, -1]) {
          const tube = addMesh(g, new THREE.CylinderGeometry(hr * 0.2, hr * 0.22, hr * 0.6, 8), mm, allMeshes);
          tube.rotation.z = Math.PI / 2;
          tube.position.set(0, 0, sign * hr * 0.22);
          const lens = addMesh(g, new THREE.CylinderGeometry(hr * 0.17, hr * 0.17, hr * 0.08, 8), glassMat(acc), allMeshes);
          lens.rotation.z = Math.PI / 2;
          lens.position.set(hr * 0.33, 0, sign * hr * 0.22);
        }
        const cord = addMesh(g, new THREE.TorusGeometry(hr * 0.62, hr * 0.05, 4, 10, Math.PI), am, allMeshes);
        cord.position.y = hr * 0.5;
        cord.rotation.y = Math.PI / 2;
        break;
      }
      case 'shoulder-pads': {
        for (const sign of [1, -1]) {
          const g = new THREE.Group();
          body.add(g);
          g.position.set(
            isBiped ? 0 : capHalf * 0.4,
            isBiped ? topY * 0.78 : c.bodyRadius * 0.62,
            sign * c.bodyRadius * 0.85,
          );
          place(g);
          g.scale.setScalar(s);
          const pad = addMesh(g, new THREE.SphereGeometry(c.bodyRadius * 0.55, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), mm, allMeshes);
          pad.rotation.z = -sign * 0.0;
          pad.rotation.x = sign * 0.45;
          pad.scale.set(1.15, 0.95, 1);
          const stud = addMesh(g, new THREE.ConeGeometry(c.bodyRadius * 0.16, c.bodyRadius * 0.4, 5), am, allMeshes);
          stud.position.set(0, c.bodyRadius * 0.32, sign * c.bodyRadius * 0.2);
          stud.rotation.x = sign * 0.5;
        }
        break;
      }
      case 'chest-strap': {
        // A band has to actually wrap the torso to read — a flat slab sunk
        // inside the capsule is invisible. Build it as a ring that clears the
        // body surface, tilted like a bandolier, with pouches riding it.
        const g = new THREE.Group();
        body.add(g);
        g.position.set(isBiped ? c.bodyRadius * 0.15 : capHalf * 0.42, isBiped ? capHalf * 0.12 : c.bodyRadius * 0.12, 0);
        place(g);
        g.scale.setScalar(s);
        const rr = c.bodyRadius * 1.06;
        const ring = addMesh(g, new THREE.TorusGeometry(rr, c.bodyRadius * 0.12, 5, 14), cm, allMeshes);
        ring.rotation.y = Math.PI / 2;
        ring.rotation.x = 0.32;
        ring.scale.set(1, 1, isBiped ? 0.98 : 0.86);
        for (let i = 0; i < 3; i++) {
          const ang = 0.55 + i * 0.55;
          const pouch = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 0.34, c.bodyRadius * 0.34, c.bodyRadius * 0.3), am, allMeshes);
          pouch.position.set(Math.sin(0.32) * rr * Math.cos(ang) * 0.4, rr * Math.sin(ang) * 0.98, rr * Math.cos(ang));
          pouch.rotation.x = -ang;
        }
        break;
      }
      case 'belt': {
        const g = new THREE.Group();
        body.add(g);
        g.position.set(0, isBiped ? -topY * 0.6 : -c.bodyRadius * 0.5, 0);
        place(g);
        g.scale.setScalar(s);
        const geo = isBiped
          ? new THREE.CylinderGeometry(c.bodyRadius * 1.04, c.bodyRadius * 1.04, c.bodyRadius * 0.34, 12, 1, true)
          : new THREE.TorusGeometry(c.bodyRadius * 0.95, c.bodyRadius * 0.12, 5, 12);
        const band = addMesh(g, geo, cm, allMeshes);
        if (!isBiped) band.rotation.y = Math.PI / 2;
        const buckle = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 0.3, c.bodyRadius * 0.3, c.bodyRadius * 0.14), am, allMeshes);
        buckle.position.set(isBiped ? c.bodyRadius * 1.0 : 0, 0, isBiped ? 0 : c.bodyRadius * 1.0);
        break;
      }
      case 'armor-plates': {
        const g = new THREE.Group();
        body.add(g);
        place(g);
        g.scale.setScalar(s);
        const n = 3;
        for (let i = 0; i < n; i++) {
          const t = (i / (n - 1)) * 2 - 1;
          const plate = addMesh(g, new THREE.BoxGeometry(capHalf * 0.44, c.bodyRadius * 0.36, c.bodyRadius * 1.05), mm, allMeshes);
          plate.position.set(t * capHalf * 0.42, topY * 0.9 - Math.abs(t) * c.bodyRadius * 0.18, 0);
          plate.rotation.z = -t * 0.22;
          const rivet = addMesh(g, new THREE.SphereGeometry(c.bodyRadius * 0.09, 5, 4), am, allMeshes);
          rivet.position.set(plate.position.x, plate.position.y + c.bodyRadius * 0.2, c.bodyRadius * 0.42);
        }
        // chest / neck guard facing the enemy
        const guard = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 0.32, c.bodyRadius * 1.1, c.bodyRadius * 1.5), mm, allMeshes);
        guard.position.set(frontX * 0.8, c.bodyRadius * 0.1, 0);
        guard.rotation.z = 0.18;
        break;
      }
      case 'armor-skirt': {
        const g = new THREE.Group();
        body.add(g);
        place(g);
        g.scale.setScalar(s);
        for (const sign of [1, -1]) {
          for (let i = 0; i < 3; i++) {
            const t = (i - 1) * 0.34;
            const p = addMesh(g, new THREE.BoxGeometry(capHalf * 0.4, c.bodyRadius * 0.72, c.bodyRadius * 0.16), mm, allMeshes);
            p.position.set(t * capHalf * 1.25, -c.bodyRadius * 0.5, sign * c.bodyRadius * 0.95);
            p.rotation.z = -t * 0.3;
          }
        }
        break;
      }
      case 'howdah': {
        const g = new THREE.Group();
        body.add(g);
        g.position.set(-capHalf * 0.16, topY * 0.88, 0);
        place(g);
        g.scale.setScalar(s);
        const deck = addMesh(g, new THREE.BoxGeometry(capHalf * 0.8, c.bodyRadius * 0.18, c.bodyRadius * 1.4), cm, allMeshes);
        for (const sx of [-1, 1]) {
          const rail = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 0.18, c.bodyRadius * 0.62, c.bodyRadius * 1.4), cm, allMeshes);
          rail.position.set(sx * capHalf * 0.36, c.bodyRadius * 0.4, 0);
        }
        for (const sz of [-1, 1]) {
          const rail = addMesh(g, new THREE.BoxGeometry(capHalf * 0.8, c.bodyRadius * 0.42, c.bodyRadius * 0.16), cm, allMeshes);
          rail.position.set(0, c.bodyRadius * 0.3, sz * c.bodyRadius * 0.66);
        }
        deck.position.y = 0;
        // banner pole + flag, the tallest point of the silhouette
        const pole = addMesh(g, new THREE.CylinderGeometry(c.bodyRadius * 0.06, c.bodyRadius * 0.06, c.bodyRadius * 2.0, 6), mm, allMeshes);
        pole.position.set(-capHalf * 0.3, c.bodyRadius * 1.0, 0);
        const flag = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 0.9, c.bodyRadius * 0.55, c.bodyRadius * 0.06), am, allMeshes);
        flag.position.set(-capHalf * 0.3 + c.bodyRadius * 0.48, c.bodyRadius * 1.72, 0);
        break;
      }
      case 'tusks': {
        const g = new THREE.Group();
        head.add(g);
        g.position.set(hr * 0.5, -hr * 0.32, 0);
        place(g);
        g.scale.setScalar(s);
        for (const sign of [1, -1]) {
          const tusk = addMesh(g, new THREE.ConeGeometry(hr * 0.17, hr * 1.5, 6), am, allMeshes);
          tusk.position.set(hr * 0.5, -hr * 0.12, sign * hr * 0.4);
          tusk.rotation.z = -Math.PI / 2 + 0.75;
          tusk.rotation.x = sign * 0.22;
        }
        break;
      }
      case 'war-paint': {
        const g = new THREE.Group();
        head.add(g);
        place(g);
        g.scale.setScalar(s);
        for (const sign of [1, -1]) {
          for (let i = 0; i < 2; i++) {
            const stripe = addMesh(g, new THREE.BoxGeometry(hr * 0.5, hr * 0.11, hr * 0.06), M(col, undefined, 0.4), allMeshes);
            stripe.position.set(hr * 0.62, -hr * (0.02 + i * 0.24), sign * hr * 0.62);
            stripe.rotation.z = -0.35;
            stripe.rotation.y = -sign * 0.5;
          }
        }
        break;
      }
      case 'cheek-blush': {
        for (const sign of [1, -1]) {
          const blush = addMesh(head, new THREE.SphereGeometry(hr * 0.24 * s, 6, 5), M(col, { roughness: 0.9 }, 0.2), allMeshes);
          blush.position.set(hr * 0.5 + off[0], -hr * 0.12 + off[1], sign * hr * 0.72 + off[2]);
          blush.scale.set(0.7, 0.6, 0.35);
        }
        break;
      }
      case 'boots': {
        for (const leg of legs) {
          const boot = addMesh(leg, new THREE.BoxGeometry(c.legRadius * 3.0 * s, c.legRadius * 1.5 * s, c.legRadius * 2.3 * s), cm, allMeshes);
          boot.position.set(c.legRadius * 0.4 + off[0], -c.legHeight * 0.62 + off[1], off[2]);
          const cuff = addMesh(leg, new THREE.CylinderGeometry(c.legRadius * 1.5 * s, c.legRadius * 1.5 * s, c.legRadius * 0.7 * s, 8), am, allMeshes);
          cuff.position.set(off[0], -c.legHeight * 0.36 + off[1], off[2]);
        }
        break;
      }
      case 'cape': {
        const g = new THREE.Group();
        body.add(g);
        g.position.set(backX * 0.7, topY * 0.55, 0);
        place(g);
        g.scale.setScalar(s);
        for (let i = 0; i < 3; i++) {
          const seg = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 0.18, c.bodyRadius * 0.7, c.bodyRadius * (1.5 - i * 0.18)), cm, allMeshes);
          seg.position.set(-i * c.bodyRadius * 0.12, -i * c.bodyRadius * 0.6, 0);
          seg.rotation.z = -0.12 * i;
        }
        break;
      }
      case 'ammo-pouch': {
        const g = new THREE.Group();
        body.add(g);
        g.position.set(isBiped ? -c.bodyRadius * 0.5 : -capHalf * 0.3, isBiped ? -capHalf * 0.36 : -c.bodyRadius * 0.2, c.bodyRadius * 1.02);
        place(g);
        g.scale.setScalar(s);
        for (let i = 0; i < 3; i++) {
          const shell = addMesh(g, new THREE.CylinderGeometry(c.bodyRadius * 0.12, c.bodyRadius * 0.12, c.bodyRadius * 0.4, 6), am, allMeshes);
          shell.position.set((i - 1) * c.bodyRadius * 0.3, 0, 0);
        }
        const holder = addMesh(g, new THREE.BoxGeometry(c.bodyRadius * 1.0, c.bodyRadius * 0.24, c.bodyRadius * 0.22), cm, allMeshes);
        holder.position.y = -c.bodyRadius * 0.12;
        break;
      }
    }
  };

  for (const spec of c.accessories ?? []) applyAccessory(spec);

  root.scale.setScalar(c.scale);
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return {
    root, body, head, legs, tail, wingL, wingR, eyeL, eyeR, mouth, jawTop, jawBottom, bodyBaseY, allMeshes,
    armL, armR,
  };
}
