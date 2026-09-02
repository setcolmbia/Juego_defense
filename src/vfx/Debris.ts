import * as THREE from 'three';
import * as CANNON from 'cannon-es';

interface Shard {
  body: CANNON.Body;
  mesh: THREE.Mesh;
  life: number;
}

/**
 * Small chunks of physically-simulated debris (cannon-es rigid bodies)
 * spawned when a creature is destroyed, for a real, tumbling destruction beat
 * rather than a purely scripted one.
 */
export class DebrisSystem {
  private world: CANNON.World;
  private shards: Shard[] = [];
  private groundBody: CANNON.Body;
  private densityScale = 1;

  constructor(private scene: THREE.Scene) {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -14, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(this.groundBody);
  }

  setDensity(scale: number) {
    this.densityScale = THREE.MathUtils.clamp(scale, 0, 1);
  }

  explode(position: THREE.Vector3, color: number, count = 7, scale = 0.14) {
    const n = Math.max(0, Math.round(count * this.densityScale));
    for (let i = 0; i < n; i++) {
      const size = scale * (0.6 + Math.random() * 0.7);
      const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
      const body = new CANNON.Body({ mass: 0.4, shape, position: new CANNON.Vec3(position.x, position.y + 0.4, position.z) });
      body.velocity.set((Math.random() - 0.5) * 5, Math.random() * 4 + 2, (Math.random() - 0.5) * 5);
      body.angularVelocity.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      this.world.addBody(body);

      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      this.scene.add(mesh);

      this.shards.push({ body, mesh, life: 1.6 });
    }
  }

  update(dt: number) {
    if (this.shards.length === 0) return;
    this.world.step(1 / 60, dt, 3);
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.life -= dt;
      s.mesh.position.copy(s.body.position as unknown as THREE.Vector3);
      s.mesh.quaternion.copy(s.body.quaternion as unknown as THREE.Quaternion);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this.world.removeBody(s.body);
        this.shards.splice(i, 1);
      }
    }
  }
}
