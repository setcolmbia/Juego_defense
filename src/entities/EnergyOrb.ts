import * as THREE from 'three';

let uidCounter = 0;

export class EnergyOrb {
  readonly uid: number;
  readonly group: THREE.Group;
  readonly amount: number;
  alive = true;
  collected = false;
  collecting = false;
  private targetY: number;
  private t = 0;
  private lifeT = 0;
  private phase = Math.random() * Math.PI * 2;
  private collectT = -1;
  private collectStart = new THREE.Vector3();

  constructor(scene: THREE.Scene, x: number, z: number, amount = 25) {
    this.uid = uidCounter++;
    this.amount = amount;
    this.group = new THREE.Group();
    this.group.position.set(x, 9, z);
    this.targetY = 0.9 + Math.random() * 0.3;

    const coreGeo = new THREE.IcosahedronGeometry(0.28, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xbdf74a,
      emissive: 0x8cff3d,
      emissiveIntensity: 1.6,
      roughness: 0.25,
      metalness: 0.1,
      flatShading: true,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.castShadow = true;
    this.group.add(core);

    const glowGeo = new THREE.SphereGeometry(0.42, 10, 8);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xbdf74a, transparent: true, opacity: 0.25 });
    this.group.add(new THREE.Mesh(glowGeo, glowMat));

    const light = new THREE.PointLight(0x9cff4a, 1.2, 4);
    this.group.add(light);

    scene.add(this.group);
  }

  get position() {
    return this.group.position;
  }

  startCollect() {
    if (this.collectT >= 0) return;
    this.collecting = true;
    this.collectT = 0;
    this.collectStart.copy(this.group.position);
  }

  update(dt: number, targetPos?: THREE.Vector3): 'alive' | 'collected' | 'expired' {
    this.t += dt;
    this.group.rotation.y += dt * 1.5;

    if (this.collectT >= 0 && targetPos) {
      this.collectT += dt * 4.2;
      const p = Math.min(1, this.collectT);
      this.group.position.lerpVectors(this.collectStart, targetPos, p * p);
      this.group.scale.setScalar(1 - p * 0.7);
      if (p >= 1) {
        this.collected = true;
        this.alive = false;
        return 'collected';
      }
      return 'alive';
    }

    if (this.group.position.y > this.targetY) {
      this.group.position.y -= dt * 3.2;
      if (this.group.position.y < this.targetY) this.group.position.y = this.targetY;
    } else {
      this.group.position.y = this.targetY + Math.sin(this.t * 2 + this.phase) * 0.08;
    }

    this.lifeT += dt;
    if (this.lifeT > 9) {
      this.alive = false;
      return 'expired';
    }
    return 'alive';
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}
