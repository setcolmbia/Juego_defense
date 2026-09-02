import * as THREE from 'three';
import { computeFitScale, type CreatureRig } from '../render/CreatureBuilder';
import { rowToZ, SPAWN_X, TILE } from '../world/GridConfig';

export interface AlienStats {
  id: string;
  name: string;
  maxHealth: number;
  damage: number;
  attackRate: number;
  speed: number; // tiles per second
  flying?: boolean;
  boss?: boolean;
  scoreValue: number;
  energyDropChance: number;
  scale: number;
  buildModel: () => CreatureRig;
}

let uidCounter = 0;

export class Alien {
  readonly uid: number;
  readonly stats: AlienStats;
  readonly rig: CreatureRig;
  readonly row: number;
  hp: number;
  alive = true;
  attackTimer = 0;
  x: number;
  private walkPhase = Math.random() * Math.PI * 2;
  private hitFlashT = -1;
  private deathT = -1;
  private bodyBaseYPos: number;
  private flyBaseY = 0;
  /** Artistic scale, clamped so attackers stay within their lane's width. */
  readonly displayScale: number;

  constructor(stats: AlienStats, row: number, spawnXOffset = 0) {
    this.uid = uidCounter++;
    this.stats = stats;
    this.row = row;
    this.hp = stats.maxHealth;
    this.x = SPAWN_X + spawnXOffset;
    this.rig = stats.buildModel();
    // Bosses get a little more headroom than rank-and-file attackers.
    const maxLen = TILE * (stats.boss ? 1.15 : 0.95);
    this.displayScale = Math.min(stats.scale, computeFitScale(this.rig.root, maxLen, maxLen));
    this.rig.root.scale.setScalar(this.displayScale);
    this.flyBaseY = stats.flying ? 2.4 : 0;
    this.rig.root.position.set(this.x, this.flyBaseY, rowToZ(row));
    // Modelled head-first along local +X; aliens march toward -X, so flip them.
    this.rig.root.rotation.y = Math.PI;
    this.bodyBaseYPos = this.rig.body.position.y;
  }

  takeDamage(amount: number) {
    if (this.deathT >= 0) return;
    this.hp -= amount;
    this.hitFlashT = 0;
    if (this.hp <= 0) {
      this.hp = 0;
      this.deathT = 0;
    }
  }

  get isDying() {
    return this.deathT >= 0;
  }

  /** Force this alien into its death/despawn sequence immediately (e.g. it reached the base). */
  destroy() {
    if (this.deathT < 0) this.deathT = 0;
    this.hp = 0;
  }

  update(dt: number, elapsed: number, moving: boolean): 'alive' | 'removeNow' {
    if (this.deathT >= 0) {
      this.deathT += dt;
      const p = this.deathT / 0.5;
      this.rig.root.scale.setScalar(Math.max(0, this.displayScale * (1 - p)));
      this.rig.root.rotation.z += dt * 8;
      this.rig.root.position.y = this.flyBaseY + p * 0.6;
      if (p >= 1) {
        this.alive = false;
        return 'removeNow';
      }
      return 'alive';
    }

    this.rig.root.position.x = this.x;

    if (moving) {
      const walkSpeed = 6 + this.stats.speed * 2;
      this.walkPhase += dt * walkSpeed;
      const swing = Math.sin(this.walkPhase);
      this.rig.legs.forEach((leg, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        leg.rotation.x = swing * dir * 0.6;
      });
      const bob = Math.abs(Math.sin(this.walkPhase)) * 0.06;
      this.rig.body.position.y = this.bodyBaseYPos + bob;
      if (this.stats.flying) {
        this.rig.root.position.y = this.flyBaseY + Math.sin(elapsed * 3 + this.walkPhase) * 0.15;
        if (this.rig.wingL && this.rig.wingR) {
          this.rig.wingL.rotation.z = Math.sin(elapsed * 14) * 0.5;
          this.rig.wingR.rotation.z = -Math.sin(elapsed * 14) * 0.5;
        }
      }
    } else {
      // attack pose: subtle forward jab
      const jab = Math.max(0, Math.sin(elapsed * this.stats.attackRate * 3)) * 0.12;
      this.rig.head.position.x = jab;
      if (this.rig.jawBottom) this.rig.jawBottom.rotation.z = -jab * 3;
      if (this.stats.flying) {
        this.rig.root.position.y = this.flyBaseY + Math.sin(elapsed * 3) * 0.15;
      }
    }

    if (this.hitFlashT >= 0) {
      this.hitFlashT += dt * 8;
      const flashAmt = Math.max(0, 1 - this.hitFlashT);
      this.rig.allMeshes.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (!mat.emissive) return;
        mat.emissive.setHex(0xff3333);
        mat.emissiveIntensity = flashAmt * 2.2;
      });
      if (this.hitFlashT >= 1) {
        this.hitFlashT = -1;
        this.rig.allMeshes.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (!mat.emissive) return;
          mat.emissive.setHex(mat.userData.baseEmissiveHex ?? 0);
          mat.emissiveIntensity = mat.userData.baseEmissiveIntensity ?? 0;
        });
      }
    }

    return 'alive';
  }
}
