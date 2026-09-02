import * as THREE from 'three';

export type EarType = 'round' | 'pointy' | 'long' | 'none';
export type TailType = 'none' | 'short' | 'long' | 'fluffy' | 'spiked';
export type HornType = 'none' | 'single' | 'double' | 'antlers' | 'crest';

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
 */
export function buildCreature(cfg: Partial<CreatureConfig>): CreatureRig {
  const c: CreatureConfig = { ...DEFAULT_CREATURE, ...cfg };
  const allMeshes: THREE.Mesh[] = [];

  const root = new THREE.Group();
  const primaryMat = mat(c.bodyColor, c, undefined, 0.1);
  const secondaryMat = mat(c.secondaryColor, c, undefined, 0.14);
  const accentMat = mat(c.accentColor, c, { roughness: 0.35, metalness: 0.2 }, 0.55);
  const eyeMat = new THREE.MeshStandardMaterial({ color: c.eyeColor, roughness: 0.2, metalness: 0.1 });
  const eyeGlowMat = c.emissiveIntensity > 0
    ? new THREE.MeshStandardMaterial({ color: c.accentColor, emissive: c.accentColor, emissiveIntensity: 2.2, roughness: 0.3 })
    : eyeMat;

  const bodyBaseY = c.legHeight;

  // ---- Legs ----
  const legs: THREE.Group[] = [];
  const legPositionsX = c.legCount === 2 ? [0] : [c.bodyLength * 0.32, -c.bodyLength * 0.32];
  const legPositionsZ = c.legCount === 2 ? [0] : [c.bodyRadius * 0.6, -c.bodyRadius * 0.6];
  for (const x of legPositionsX) {
    for (const z of legPositionsZ) {
      const legGroup = new THREE.Group();
      legGroup.position.set(x, bodyBaseY, z);
      const upperGeo = new THREE.CapsuleGeometry(c.legRadius, c.legHeight * 0.55, 2, 6);
      const upper = addMesh(legGroup, upperGeo, secondaryMat, allMeshes);
      upper.position.y = -c.legHeight * 0.3;
      const footGeo = new THREE.SphereGeometry(c.legRadius * 1.15, 6, 5);
      const foot = addMesh(legGroup, footGeo, primaryMat, allMeshes);
      foot.position.y = -c.legHeight * 0.62;
      foot.scale.set(1.1, 0.6, 1.3);
      root.add(legGroup);
      legs.push(legGroup);
    }
  }
  if (c.legCount === 2) {
    // duplicate for a believable biped stance (slightly apart)
    legs[0].position.z = 0.18;
    const clone = legs[0].clone();
    clone.position.z = -0.18;
    root.add(clone);
    legs.push(clone);
  }

  // ---- Body ----
  const body = new THREE.Group();
  body.position.y = bodyBaseY + c.bodyRadius * 0.55;
  root.add(body);
  const bodyGeo = new THREE.CapsuleGeometry(c.bodyRadius, c.bodyLength, 3, 8);
  const bodyMesh = addMesh(body, bodyGeo, primaryMat, allMeshes);
  bodyMesh.rotation.z = Math.PI / 2;
  bodyMesh.scale.set(1, 1, c.bodyHeight ?? 1);

  if (c.armored) {
    // BoxGeometry args are (width=X, height=Y, depth=Z). Body length runs
    // along X and body width along Z, so this previously had X/Z swapped —
    // the plate was a short-but-very-wide slab running crosswise (often
    // wider than the body itself), reading as a detached floating cube
    // rather than a saddle of armor along the spine. Run it along X instead,
    // keep it narrower than the body diameter so it hugs the curve, and sink
    // it in a bit further so it reads as plating on the body, not a block
    // resting on top of it.
    const plateGeo = new THREE.BoxGeometry(c.bodyLength * 0.68, c.bodyRadius * 0.4, c.bodyRadius * 1.3);
    const plate = addMesh(body, plateGeo, accentMat, allMeshes);
    plate.position.y = c.bodyRadius * 0.68;
  }

  if (c.spikeCount) {
    // Cone half-height is fixed (0.17) regardless of body size, so anchoring
    // the spike center at a fraction of bodyRadius buried most of the cone
    // inside the body surface — spikes read as invisible. Anchor relative to
    // the actual capsule surface instead so the quill/spike clearly protrudes.
    const spikeH = 0.34;
    for (let i = 0; i < c.spikeCount; i++) {
      const t = (i / Math.max(1, c.spikeCount - 1)) * 2 - 1;
      const spikeGeo = new THREE.ConeGeometry(0.07, spikeH, 5);
      const spike = addMesh(body, spikeGeo, accentMat, allMeshes);
      const zSide = c.spikeCount > 5 ? (i % 2 === 0 ? 1 : -1) * c.bodyRadius * 0.3 : 0;
      spike.position.set(t * c.bodyLength * 0.45, c.bodyRadius + spikeH * 0.44, zSide);
      spike.rotation.x = -0.25;
      spike.rotation.z = zSide > 0 ? -0.2 : zSide < 0 ? 0.2 : 0;
    }
  }

  // ---- Tail ----
  let tail: THREE.Group | null = null;
  if (c.tailType !== 'none') {
    tail = new THREE.Group();
    tail.position.set(-c.bodyLength * 0.55, 0, 0);
    body.add(tail);
    if (c.tailType === 'fluffy') {
      const tuftGeo = new THREE.SphereGeometry(0.22, 6, 6);
      const tuft = addMesh(tail, tuftGeo, secondaryMat, allMeshes);
      tuft.position.x = -0.35;
      const baseGeo = new THREE.CapsuleGeometry(0.07, 0.35, 2, 5);
      const base = addMesh(tail, baseGeo, primaryMat, allMeshes);
      base.rotation.z = Math.PI / 2;
      base.position.x = -0.15;
    } else if (c.tailType === 'spiked') {
      const len = c.tailType === 'spiked' ? 0.7 : 0.4;
      const baseGeo = new THREE.ConeGeometry(0.14, len, 6);
      const base = addMesh(tail, baseGeo, secondaryMat, allMeshes);
      base.rotation.z = Math.PI / 2;
      base.position.x = -len / 2;
    } else {
      const len = c.tailType === 'long' ? 0.9 : 0.4;
      const baseGeo = new THREE.CapsuleGeometry(0.08, len, 2, 6);
      const base = addMesh(tail, baseGeo, secondaryMat, allMeshes);
      base.rotation.z = Math.PI / 2;
      base.position.x = -len / 2;
    }
  }

  // ---- Wings ----
  let wingL: THREE.Group | null = null;
  let wingR: THREE.Group | null = null;
  if (c.hasWings) {
    const makeWing = (sign: number) => {
      const w = new THREE.Group();
      w.position.set(0, c.bodyRadius * 0.4, sign * c.bodyRadius * 0.9);
      const wingGeo = new THREE.ConeGeometry(c.bodyLength * 0.5, c.bodyLength * 0.9, 4, 1, true);
      const wingMesh = addMesh(w, wingGeo, secondaryMat, allMeshes);
      wingMesh.rotation.z = Math.PI / 2;
      wingMesh.rotation.y = sign * 0.3;
      wingMesh.scale.set(0.4, 1, 1);
      wingMesh.position.z = sign * c.bodyLength * 0.35;
      return w;
    };
    wingL = makeWing(1);
    wingR = makeWing(-1);
    body.add(wingL, wingR);
  }

  // ---- Neck + Head ----
  const head = new THREE.Group();
  head.position.set(c.bodyLength * 0.5 + c.neckLength, c.bodyRadius * 0.3, 0);
  body.add(head);

  if (c.neckLength > 0.05) {
    const neckGeo = new THREE.CapsuleGeometry(c.bodyRadius * 0.5, c.neckLength, 2, 6);
    const neck = addMesh(body, neckGeo, primaryMat, allMeshes);
    neck.rotation.z = Math.PI / 2 - 0.5;
    neck.position.set(c.bodyLength * 0.42, c.bodyRadius * 0.15 + c.neckLength * 0.35, 0);
  }

  const headGeo = new THREE.SphereGeometry(c.headRadius, 8, 7);
  addMesh(head, headGeo, primaryMat, allMeshes);

  // snout / jaw
  let jawTop: THREE.Group | null = null;
  let jawBottom: THREE.Group | null = null;
  let mouth: THREE.Group | null = null;
  if (c.snoutLength > 0.01) {
    jawTop = new THREE.Group();
    jawTop.position.set(c.headRadius * 0.7, 0.02, 0);
    head.add(jawTop);
    const snoutGeo = new THREE.CapsuleGeometry(c.headRadius * 0.4, c.snoutLength, 2, 6);
    const snout = addMesh(jawTop, snoutGeo, secondaryMat, allMeshes);
    snout.rotation.z = Math.PI / 2;
    snout.position.x = c.snoutLength * 0.5;

    jawBottom = new THREE.Group();
    jawBottom.position.set(c.headRadius * 0.6, -c.headRadius * 0.25, 0);
    head.add(jawBottom);
    const jawGeo = new THREE.CapsuleGeometry(c.headRadius * 0.28, c.snoutLength * 0.85, 2, 5);
    const jawMesh = addMesh(jawBottom, jawGeo, secondaryMat, allMeshes);
    jawMesh.rotation.z = Math.PI / 2;
    jawMesh.position.x = c.snoutLength * 0.4;
    mouth = jawBottom;
  }

  // eyes
  const eyeGeo = new THREE.SphereGeometry(c.headRadius * 0.18, 6, 6);
  const eyeL = addMesh(head, eyeGeo, eyeGlowMat, allMeshes);
  eyeL.position.set(c.headRadius * 0.55, c.headRadius * 0.25, c.headRadius * 0.45);
  const eyeR = addMesh(head, eyeGeo, eyeGlowMat, allMeshes);
  eyeR.position.set(c.headRadius * 0.55, c.headRadius * 0.25, -c.headRadius * 0.45);

  // ears
  if (c.earType !== 'none') {
    const makeEar = (sign: number) => {
      let earGeo: THREE.BufferGeometry;
      if (c.earType === 'long') earGeo = new THREE.ConeGeometry(c.headRadius * 0.28, c.headRadius * 1.4, 5);
      else if (c.earType === 'pointy') earGeo = new THREE.ConeGeometry(c.headRadius * 0.32, c.headRadius * 0.7, 4);
      else earGeo = new THREE.SphereGeometry(c.headRadius * 0.32, 6, 5);
      const ear = addMesh(head, earGeo, secondaryMat, allMeshes);
      ear.position.set(-c.headRadius * 0.1, c.headRadius * 0.75, sign * c.headRadius * 0.55);
      ear.rotation.z = -sign * 0.2;
      return ear;
    };
    makeEar(1);
    makeEar(-1);
  }

  // horns
  if (c.hornType !== 'none') {
    if (c.hornType === 'single') {
      const hornGeo = new THREE.ConeGeometry(c.headRadius * 0.14, c.headRadius * 1.1, 6);
      const horn = addMesh(head, hornGeo, accentMat, allMeshes);
      horn.position.set(c.headRadius * 0.9, c.headRadius * 0.1, 0);
      horn.rotation.z = Math.PI / 2 - 0.3;
    } else if (c.hornType === 'double') {
      for (const sign of [1, -1]) {
        const hornGeo = new THREE.ConeGeometry(c.headRadius * 0.12, c.headRadius * 0.8, 5);
        const horn = addMesh(head, hornGeo, accentMat, allMeshes);
        horn.position.set(c.headRadius * 0.2, c.headRadius * 0.85, sign * c.headRadius * 0.4);
        horn.rotation.z = 0.5;
        horn.rotation.x = sign * 0.4;
      }
    } else if (c.hornType === 'antlers') {
      for (const sign of [1, -1]) {
        const g = new THREE.Group();
        g.position.set(0, c.headRadius * 0.8, sign * c.headRadius * 0.3);
        head.add(g);
        for (let i = 0; i < 3; i++) {
          const tineGeo = new THREE.ConeGeometry(0.03, 0.35 - i * 0.08, 4);
          const tine = addMesh(g, tineGeo, accentMat, allMeshes);
          tine.position.set(i * 0.06, 0.15 + i * 0.12, sign * i * 0.08);
          tine.rotation.z = 0.3;
        }
      }
    } else if (c.hornType === 'crest') {
      const crestGeo = new THREE.ConeGeometry(c.headRadius * 0.5, c.headRadius * 0.9, 4);
      const crest = addMesh(head, crestGeo, accentMat, allMeshes);
      crest.position.set(-c.headRadius * 0.1, c.headRadius * 0.85, 0);
      crest.scale.set(0.3, 1, 1);
    }
  }

  root.scale.setScalar(c.scale);
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return { root, body, head, legs, tail, wingL, wingR, eyeL, eyeR, mouth, jawTop, jawBottom, bodyBaseY, allMeshes };
}
