import * as THREE from 'three';
import type { CreatureRig } from '../render/CreatureBuilder';
import { colToX, rowToZ } from '../world/GridConfig';

export type AttackSound = 'spike' | 'peck' | 'roar' | 'zap';

export interface DefenderStats {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  cooldown: number;
  maxHealth: number;
  damage: number;
  attackRate: number;
  range: number;
  aoeRadius?: number;
  antiAir?: boolean;
  isSupport?: boolean;
  energyInterval?: number;
  energyAmount?: number;
  projectileColor: number;
  scale: number;
  attackSound: AttackSound;
  buildModel: () => CreatureRig;
}

let uidCounter = 0;

export class Defender {
  readonly uid: number;
  readonly stats: DefenderStats;
  readonly rig: CreatureRig;
  readonly col: number;
  readonly row: number;
  hp: number;
  alive = true;
  attackTimer: number;
  energyTimer: number;
  private attackAnimT = -1;
  private hitFlashT = -1;
  private idlePhase = Math.random() * Math.PI * 2;
  private spawnT = 0;
  private bodyBaseYPos: number;

  constructor(stats: DefenderStats, col: number, row: number) {
    this.uid = uidCounter++;
    this.stats = stats;
    this.col = col;
    this.row = row;
    this.hp = stats.maxHealth;
    this.attackTimer = Math.random() * 0.3;
    this.energyTimer = stats.energyInterval ?? 3;
    this.rig = stats.buildModel();
    this.rig.root.scale.setScalar(0.001);
    this.rig.root.position.set(colToX(col), 0, rowToZ(row));
    this.rig.root.rotation.y = Math.PI / 2; // face down the lane (+X)
    this.bodyBaseYPos = this.rig.body.position.y;
  }

  get worldX() {
    return this.rig.root.position.x;
  }
  get worldZ() {
    return this.rig.root.position.z;
  }

  triggerAttackAnim() {
    this.attackAnimT = 0;
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    this.hitFlashT = 0;
    if (this.hp <= 0) this.alive = false;
  }

  update(dt: number, elapsed: number) {
    // spawn grow-in animation
    if (this.spawnT < 1) {
      this.spawnT = Math.min(1, this.spawnT + dt * 2.2);
      const s = THREE.MathUtils.smoothstep(this.spawnT, 0, 1) * this.stats.scale;
      this.rig.root.scale.setScalar(Math.max(0.001, s));
    }

    // idle breathing / bob
    const bob = Math.sin(elapsed * 2.2 + this.idlePhase) * 0.035;
    this.rig.body.position.y = this.bodyBaseYPos + bob;
    this.rig.head.rotation.z = Math.sin(elapsed * 1.4 + this.idlePhase) * 0.03;

    // attack animation: quick lunge/pulse
    if (this.attackAnimT >= 0) {
      this.attackAnimT += dt * 6;
      const p = Math.min(1, this.attackAnimT);
      const lunge = Math.sin(p * Math.PI) * 0.15;
      this.rig.root.position.x = colToX(this.col) + lunge;
      if (this.rig.jawBottom) this.rig.jawBottom.rotation.z = -Math.sin(p * Math.PI) * 0.5;
      if (p >= 1) this.attackAnimT = -1;
    } else {
      this.rig.root.position.x = colToX(this.col);
    }

    // hit flash
    if (this.hitFlashT >= 0) {
      this.hitFlashT += dt * 8;
      const flash = Math.max(0, 1 - this.hitFlashT);
      this.rig.allMeshes.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (!mat.emissive) return;
        if (flash > 0) {
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = flash * 1.8;
        } else {
          mat.emissive.setHex(mat.userData.baseEmissiveHex ?? 0);
          mat.emissiveIntensity = mat.userData.baseEmissiveIntensity ?? 0;
        }
      });
      if (this.hitFlashT >= 1) this.hitFlashT = -1;
    }
  }
}
