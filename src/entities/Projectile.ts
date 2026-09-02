import * as THREE from 'three';
import type { Alien } from './Alien';

export type ProjectileKind = 'spike' | 'feather' | 'zap' | 'shock';

export class Projectile {
  readonly mesh: THREE.Mesh;
  readonly trail: THREE.Points;
  alive = true;
  private trailPositions: Float32Array;
  private trailHead = 0;
  private readonly trailLength = 8;

  constructor(
    scene: THREE.Scene,
    public origin: THREE.Vector3,
    public target: Alien,
    public damage: number,
    public speed: number,
    public color: number,
    public kind: ProjectileKind,
    public aoeRadius = 0,
  ) {
    const geo =
      kind === 'spike'
        ? new THREE.ConeGeometry(0.06, 0.28, 6)
        : kind === 'feather'
          ? new THREE.ConeGeometry(0.05, 0.22, 4)
          : new THREE.SphereGeometry(0.08, 6, 6);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, roughness: 0.3 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(origin);
    this.mesh.rotation.z = -Math.PI / 2;
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    this.trailPositions = new Float32Array(this.trailLength * 3);
    for (let i = 0; i < this.trailLength; i++) {
      this.trailPositions[i * 3] = origin.x;
      this.trailPositions[i * 3 + 1] = origin.y;
      this.trailPositions[i * 3 + 2] = origin.z;
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({ color, size: 0.09, transparent: true, opacity: 0.6, sizeAttenuation: true });
    this.trail = new THREE.Points(trailGeo, trailMat);
    scene.add(this.trail);
  }

  update(dt: number): 'flying' | 'hit' | 'miss' {
    if (!this.target.alive) {
      this.alive = false;
      return 'miss';
    }
    const targetPos = this.target.rig.root.position;
    const aimPoint = new THREE.Vector3(targetPos.x, targetPos.y + 0.9, targetPos.z);
    const dir = new THREE.Vector3().subVectors(aimPoint, this.mesh.position);
    const dist = dir.length();
    const step = this.speed * dt;
    if (dist <= step || dist < 0.15) {
      this.mesh.position.copy(aimPoint);
      this.alive = false;
      return 'hit';
    }
    dir.normalize();
    this.mesh.position.addScaledVector(dir, step);
    this.mesh.lookAt(aimPoint);

    this.trailHead = (this.trailHead + 1) % this.trailLength;
    for (let i = this.trailLength - 1; i > 0; i--) {
      this.trailPositions[i * 3] = this.trailPositions[(i - 1) * 3];
      this.trailPositions[i * 3 + 1] = this.trailPositions[(i - 1) * 3 + 1];
      this.trailPositions[i * 3 + 2] = this.trailPositions[(i - 1) * 3 + 2];
    }
    this.trailPositions[0] = this.mesh.position.x;
    this.trailPositions[1] = this.mesh.position.y;
    this.trailPositions[2] = this.mesh.position.z;
    (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    return 'flying';
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    scene.remove(this.trail);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
  }
}
