import * as THREE from 'three';
import { EnergyOrb } from '../entities/EnergyOrb';
import { BASE_X, COLS, ROWS, colToX, rowToZ } from '../world/GridConfig';

export class EconomyManager {
  energy = 150;
  readonly orbs: EnergyOrb[] = [];
  private fallTimer = 4;
  onChange: (() => void) | null = null;

  constructor(private scene: THREE.Scene) {}

  canAfford(cost: number) {
    return this.energy >= cost;
  }

  spend(cost: number) {
    this.energy -= cost;
    this.onChange?.();
  }

  add(amount: number) {
    this.energy += amount;
    this.onChange?.();
  }

  spawnManualOrb(x: number, z: number, amount = 20) {
    const orb = new EnergyOrb(this.scene, x, z, amount);
    this.orbs.push(orb);
  }

  update(dt: number, waveActive: boolean) {
    if (waveActive) {
      this.fallTimer -= dt;
      if (this.fallTimer <= 0) {
        this.fallTimer = THREE.MathUtils.randFloat(5, 8);
        const col = THREE.MathUtils.randInt(0, COLS - 1);
        const row = THREE.MathUtils.randInt(0, ROWS - 1);
        this.spawnManualOrb(colToX(col), rowToZ(row), 25);
      }
    }

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      const result = orb.update(dt, orb.collecting ? this.collectTarget : undefined);
      if (result === 'collected') this.add(orb.amount);
      if (result !== 'alive') {
        orb.dispose(this.scene);
        this.orbs.splice(i, 1);
      }
    }
  }

  private collectTarget = new THREE.Vector3(BASE_X, 1, 0);

  tryCollect(ndc: THREE.Vector2, camera: THREE.Camera): EnergyOrb | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    for (const orb of this.orbs) {
      if (orb.collected || orb.collecting) continue;
      const dist = raycaster.ray.distanceToPoint(orb.position);
      if (dist < 0.6) {
        orb.startCollect();
        return orb;
      }
    }
    return null;
  }
}
