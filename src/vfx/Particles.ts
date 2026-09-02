import * as THREE from 'three';

interface Burst {
  points: THREE.Points;
  velocities: Float32Array;
  gravity: number;
  drag: number;
  life: number;
  maxLife: number;
  fadeOut: boolean;
}

export class ParticleSystem {
  private bursts: Burst[] = [];
  private densityScale = 1;

  constructor(private scene: THREE.Scene) {}

  setDensity(scale: number) {
    this.densityScale = THREE.MathUtils.clamp(scale, 0, 1);
  }

  private spawnBurst(opts: {
    position: THREE.Vector3;
    count: number;
    color: number;
    size: number;
    speed: number;
    spread: number;
    life: number;
    gravity?: number;
    drag?: number;
    upBias?: number;
  }) {
    const count = Math.max(1, Math.round(opts.count * this.densityScale));
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = opts.position.x;
      positions[i * 3 + 1] = opts.position.y;
      positions[i * 3 + 2] = opts.position.z;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const s = opts.speed * (0.4 + Math.random() * 0.6);
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * s * opts.spread;
      velocities[i * 3 + 1] = Math.cos(phi) * s * opts.spread + (opts.upBias ?? 0);
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * s * opts.spread;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: opts.color,
      size: opts.size,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.bursts.push({
      points,
      velocities,
      gravity: opts.gravity ?? -4,
      drag: opts.drag ?? 0.94,
      life: opts.life,
      maxLife: opts.life,
      fadeOut: true,
    });
  }

  impactSpark(position: THREE.Vector3, color = 0xffcf6b) {
    this.spawnBurst({ position, count: 10, color, size: 0.09, speed: 3, spread: 1, life: 0.4, gravity: -8 });
  }

  deathBurst(position: THREE.Vector3, color = 0x9d5cff) {
    this.spawnBurst({ position, count: 22, color, size: 0.12, speed: 3.5, spread: 1, life: 0.7, gravity: -6, upBias: 1.5 });
  }

  collectSparkle(position: THREE.Vector3, color = 0x9cff4a) {
    this.spawnBurst({ position, count: 14, color, size: 0.08, speed: 1.8, spread: 0.8, life: 0.5, gravity: -1, upBias: 1.2 });
  }

  muzzleFlash(position: THREE.Vector3, color = 0xffffff) {
    this.spawnBurst({ position, count: 6, color, size: 0.07, speed: 1.2, spread: 0.6, life: 0.15, gravity: 0 });
  }

  shockwaveDust(position: THREE.Vector3, color = 0xc9a876) {
    this.spawnBurst({ position, count: 18, color, size: 0.15, speed: 2.2, spread: 1.3, life: 0.6, gravity: -2, upBias: 0.6 });
  }

  update(dt: number) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.scene.remove(b.points);
        b.points.geometry.dispose();
        (b.points.material as THREE.Material).dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      const pos = b.points.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let j = 0; j < arr.length / 3; j++) {
        b.velocities[j * 3 + 1] += b.gravity * dt;
        arr[j * 3] += b.velocities[j * 3] * dt;
        arr[j * 3 + 1] += b.velocities[j * 3 + 1] * dt;
        arr[j * 3 + 2] += b.velocities[j * 3 + 2] * dt;
        b.velocities[j * 3] *= b.drag;
        b.velocities[j * 3 + 2] *= b.drag;
      }
      pos.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity = Math.max(0, b.life / b.maxLife);
    }
  }
}
