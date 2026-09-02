import * as THREE from 'three';
import { Defender, type DefenderStats } from '../entities/Defender';
import { Alien, type AlienStats } from '../entities/Alien';
import { Projectile } from '../entities/Projectile';
import { Grid } from '../world/Grid';
import { ParticleSystem } from '../vfx/Particles';
import { DebrisSystem } from '../vfx/Debris';
import { AudioManager } from '../core/AudioManager';
import { EconomyManager } from './EconomyManager';
import { TILE, BASE_X, rowToZ } from '../world/GridConfig';

export interface CombatCallbacks {
  onBaseHit: (damage: number) => void;
  onDefenderLost: (d: Defender) => void;
}

export class CombatSystem {
  readonly defenders: Defender[] = [];
  readonly aliens: Alien[] = [];
  readonly projectiles: Projectile[] = [];

  constructor(
    private scene: THREE.Scene,
    private grid: Grid,
    private particles: ParticleSystem,
    private debris: DebrisSystem,
    private audio: AudioManager,
    private economy: EconomyManager,
    private callbacks: CombatCallbacks,
  ) {}

  addDefender(stats: DefenderStats, col: number, row: number): Defender {
    const d = new Defender(stats, col, row);
    this.defenders.push(d);
    this.scene.add(d.rig.root);
    this.grid.setOccupied(col, row, true);
    return d;
  }

  spawnAlien(stats: AlienStats, row: number, xOffset = 0): Alien {
    const a = new Alien(stats, row, xOffset);
    this.aliens.push(a);
    this.scene.add(a.rig.root);
    return a;
  }

  private findTargetForDefender(d: Defender): Alien | null {
    let best: Alien | null = null;
    let bestDist = Infinity;
    for (const a of this.aliens) {
      if (!a.alive || a.isDying) continue;
      if (a.row !== d.row) continue;
      if (a.stats.flying && !d.stats.antiAir && d.stats.range <= 1.2) continue; // melee can't hit flyers
      const dist = a.x - d.worldX;
      if (dist < -0.3) continue; // behind the defender
      if (dist > d.stats.range * TILE) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = a;
      }
    }
    return best;
  }

  private findBlockingDefenderAhead(a: Alien): Defender | null {
    let best: Defender | null = null;
    let bestDist = Infinity;
    for (const d of this.defenders) {
      if (!d.alive) continue;
      if (d.row !== a.row) continue;
      const dist = a.x - d.worldX;
      if (dist < -0.2) continue;
      if (dist > 0.75) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  }

  update(dt: number, elapsed: number) {
    // --- defenders act ---
    for (const d of this.defenders) {
      if (!d.alive) continue;
      d.update(dt, elapsed);
      if (d.stats.isSupport) {
        d.energyTimer -= dt;
        if (d.energyTimer <= 0) {
          d.energyTimer = d.stats.energyInterval ?? 8;
          this.economy.spawnManualOrb(d.worldX, d.worldZ + 0.3, d.stats.energyAmount ?? 20);
          d.triggerAttackAnim();
        }
        continue;
      }
      d.attackTimer -= dt;
      if (d.attackTimer <= 0) {
        const target = this.findTargetForDefender(d);
        if (target) {
          d.attackTimer = d.stats.attackRate;
          d.triggerAttackAnim();
          if (d.stats.range <= 1.2) {
            // melee: instant damage, no projectile
            this.audio.playShoot(d.stats.attackSound);
            this.applyDamageToAlien(target, d.stats.damage, d.stats.aoeRadius, d.row);
            this.particles.impactSpark(target.rig.root.position.clone().add(new THREE.Vector3(0, 0.6, 0)), d.stats.projectileColor);
          } else {
            this.audio.playShoot(d.stats.attackSound);
            const origin = d.rig.root.position.clone().add(new THREE.Vector3(0.4, 0.7, 0));
            this.particles.muzzleFlash(origin, d.stats.projectileColor);
            const proj = new Projectile(
              this.scene,
              origin,
              target,
              d.stats.damage,
              10 + d.stats.range,
              d.stats.projectileColor,
              d.stats.aoeRadius ? 'shock' : 'spike',
              d.stats.aoeRadius ?? 0,
            );
            this.projectiles.push(proj);
          }
        }
      }
    }

    // --- projectiles ---
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const result = p.update(dt);
      if (result === 'hit') {
        this.applyDamageToAlien(p.target, p.damage, p.aoeRadius, p.target.row);
        this.particles.impactSpark(p.mesh.position.clone(), p.color);
        this.audio.playImpact();
      }
      if (result !== 'flying') {
        p.dispose(this.scene);
        this.projectiles.splice(i, 1);
      }
    }

    // --- aliens act ---
    for (const a of this.aliens) {
      if (!a.alive) continue;
      const blocker = a.isDying ? null : this.findBlockingDefenderAhead(a);
      const moving = !blocker;
      const state = a.update(dt, elapsed, moving);
      if (state === 'removeNow') {
        this.scene.remove(a.rig.root);
        continue;
      }
      if (blocker) {
        a.attackTimer -= dt;
        if (a.attackTimer <= 0) {
          a.attackTimer = a.stats.attackRate;
          blocker.takeDamage(a.stats.damage);
          this.particles.impactSpark(blocker.rig.root.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xff5555);
          this.audio.playImpact();
          if (!blocker.alive) {
            this.killDefender(blocker);
          }
        }
      } else if (!a.isDying) {
        a.x -= a.stats.speed * TILE * dt;
        if (a.x <= BASE_X) {
          this.callbacks.onBaseHit(a.stats.damage * 2);
          a.destroy();
          this.killAlien(a, false);
        }
      }
    }

    // cleanup dead aliens (already dying handled by their own update -> removeNow)
    for (let i = this.aliens.length - 1; i >= 0; i--) {
      if (!this.aliens[i].alive) this.aliens.splice(i, 1);
    }
    for (let i = this.defenders.length - 1; i >= 0; i--) {
      if (!this.defenders[i].alive) this.defenders.splice(i, 1);
    }
  }

  private applyDamageToAlien(target: Alien, damage: number, aoeRadius: number | undefined, row: number) {
    const wasAlive = target.hp > 0;
    target.takeDamage(damage);
    if (wasAlive && target.hp <= 0) this.killAlien(target, true);

    if (aoeRadius && aoeRadius > 0) {
      const centerX = target.rig.root.position.x;
      for (const other of this.aliens) {
        if (other === target || !other.alive || other.isDying) continue;
        if (other.row !== row) continue;
        if (Math.abs(other.rig.root.position.x - centerX) <= aoeRadius * TILE) {
          other.takeDamage(damage * 0.6);
          if (other.hp <= 0) this.killAlien(other, true);
        }
      }
      this.particles.shockwaveDust(new THREE.Vector3(centerX, 0.3, rowToZ(row)), 0xffb37a);
    }
  }

  private killAlien(a: Alien, reward: boolean) {
    this.particles.deathBurst(a.rig.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x9d5cff);
    this.debris.explode(a.rig.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x6b4fa0);
    this.audio.playDeath();
    if (reward && Math.random() < a.stats.energyDropChance) {
      this.economy.spawnManualOrb(a.rig.root.position.x, a.rig.root.position.z, 15);
    }
  }

  private killDefender(d: Defender) {
    this.particles.deathBurst(d.rig.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xffcf6b);
    this.debris.explode(d.rig.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x8a5326);
    this.audio.playDeath();
    this.grid.setOccupied(d.col, d.row, false);
    this.scene.remove(d.rig.root);
    this.callbacks.onDefenderLost(d);
  }
}
