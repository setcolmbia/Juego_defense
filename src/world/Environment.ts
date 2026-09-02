import * as THREE from 'three';
import { COLS, ROWS, TILE, colToX, rowToZ, BASE_X, SPAWN_X } from './GridConfig';

function valueNoise2D(seed: number) {
  const rand = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
    return s - Math.floor(s);
  };
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = rand(xi, yi);
    const b = rand(xi + 1, yi);
    const c = rand(xi, yi + 1);
    const d = rand(xi + 1, yi + 1);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, u), THREE.MathUtils.lerp(c, d, u), v);
  };
}

export interface EnvironmentHandles {
  group: THREE.Group;
  sun: THREE.DirectionalLight;
  update(dt: number, elapsed: number): void;
}

export function buildEnvironment(scene: THREE.Scene): EnvironmentHandles {
  const group = new THREE.Group();
  scene.add(group);

  // ---------------- Sky ----------------
  const skyGeo = new THREE.SphereGeometry(140, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x352a66) },
      midColor: { value: new THREE.Color(0xaa5a6e) },
      bottomColor: { value: new THREE.Color(0xffb37a) },
      offset: { value: 3.2 },
      exponent: { value: 1.1 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        // NOTE: the gameplay camera sits at a steep downward pitch (see setupCamera in
        // Game.ts) so the sky sphere is only ever grazed near its "equator" - the visible
        // band of h is roughly [-0.08, 0.05], never reaching the old thresholds. These are
        // tuned tight around that visible band so the full bottom->mid->top story actually
        // reads on screen instead of flattening to one warm tone.
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        vec3 col = mix(bottomColor, midColor, smoothstep(-0.07, -0.01, h));
        col = mix(col, topColor, smoothstep(-0.015, 0.05, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  group.add(sky);

  // Stars - biased low (near the visible sky band grazed by the steeply-pitched camera,
  // see the sky shader note above) so a handful actually land on screen instead of all
  // sitting far above the frustum's ceiling.
  const starGeo = new THREE.BufferGeometry();
  const starCount = 500;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 130;
    const theta = Math.random() * Math.PI * 2;
    const h = Math.pow(Math.random(), 2.2); // biased toward 0 (low/near-horizon)
    starPos[i * 3] = r * Math.cos(theta);
    starPos[i * 3 + 1] = h * 30 - 4;
    starPos[i * 3 + 2] = r * Math.sin(theta);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.85, sizeAttenuation: true });
  const stars = new THREE.Points(starGeo, starMat);
  group.add(stars);

  // Alien motherships (silhouettes far in background, near spawn side).
  // The gameplay camera (see setupCamera in Game.ts) is pitched down steeply enough that
  // its frustum ceiling sits just BELOW world-horizontal - nothing much above the camera's
  // own eye height (~9.4) is ever in view, no matter how far away it is. So these sit low
  // and close to the horizon rather than "high in the sky" - positions were dialed in by
  // iterating against real screenshots, not just the raw trig.
  const shipGroup = new THREE.Group();
  const shipDefs = [
    { pos: new THREE.Vector3(23, 3.5, -16), scale: 1.0 },
    { pos: new THREE.Vector3(10, 3.5, -24), scale: 0.8 },
    { pos: new THREE.Vector3(28, 1.3, -29), scale: 0.55 },
  ];
  shipDefs.forEach(({ pos, scale }, i) => {
    const ship = new THREE.Group();
    const hullGeo = new THREE.SphereGeometry(4 * scale, 8, 6);
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x1a1230, emissive: 0x6b2fbf, emissiveIntensity: 0.75, roughness: 0.4, metalness: 0.6, flatShading: true });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.scale.set(1, 0.25, 1);
    ship.add(hull);
    const glowGeo = new THREE.RingGeometry(1.8 * scale, 2.5 * scale, 24);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x9d5cff, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    ship.add(glow);
    const beamGeo = new THREE.ConeGeometry(0.5 * scale, 3 * scale, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x9d5cff, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = -1.5 * scale;
    ship.add(beam);
    ship.position.copy(pos);
    ship.userData.baseY = pos.y;
    shipGroup.add(ship);
  });
  group.add(shipGroup);

  // ---------------- Terrain ----------------
  const width = (COLS + 3) * TILE;
  const depth = (ROWS + 2) * TILE;
  const segX = 48;
  const segZ = 32;
  const groundGeo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  groundGeo.rotateX(-Math.PI / 2);
  const noise = valueNoise2D(7);
  const posAttr = groundGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);
  const grassColorA = new THREE.Color(0x5b8a3a);
  const grassColorB = new THREE.Color(0x8fae4a);
  const dirtColor = new THREE.Color(0xa9773f);
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const n = noise(x * 0.15, z * 0.15);
    const y = n * 0.22;
    posAttr.setY(i, y);

    const localCol = x / TILE;
    const inLane = localCol > -1.8 && localCol < COLS + 0.3;
    let col: THREE.Color;
    if (inLane) {
      col = grassColorA.clone().lerp(grassColorB, valueNoise2D(3)(x * 0.4, z * 0.4));
      col.lerp(dirtColor, Math.max(0, n - 0.5) * 0.6);
    } else {
      col = grassColorA.clone().lerp(new THREE.Color(0x3c6b2b), 0.5);
    }
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.02, flatShading: true });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  ground.position.set(colToX((COLS - 1) / 2), 0, 0);
  group.add(ground);

  // Lane tile outlines (subtle)
  const laneLinesMat = new THREE.LineBasicMaterial({ color: 0xdfe8c8, transparent: true, opacity: 0.4 });
  for (let r = 0; r <= ROWS; r++) {
    const z = (r - ROWS / 2) * TILE;
    const pts = [new THREE.Vector3(BASE_X - TILE, 0.15, z), new THREE.Vector3(colToX(COLS - 1) + TILE, 0.15, z)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geo, laneLinesMat));
  }

  // Rim rocks / foliage clumps for framing
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b6558, roughness: 1, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const s = 0.4 + Math.random() * 0.8;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    const side = Math.random() > 0.5 ? 1 : -1;
    rock.position.set(THREE.MathUtils.randFloat(BASE_X - 2, colToX(COLS - 1) + 4), s * 0.4, side * (ROWS / 2 * TILE + THREE.MathUtils.randFloat(1, 4)));
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  const bushMat = new THREE.MeshStandardMaterial({ color: 0x3f6b2a, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 22; i++) {
    const s = 0.5 + Math.random() * 0.9;
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), bushMat);
    const side = Math.random() > 0.5 ? 1 : -1;
    bush.position.set(THREE.MathUtils.randFloat(BASE_X - 3, colToX(COLS - 1) + 6), s * 0.5, side * (ROWS / 2 * TILE + THREE.MathUtils.randFloat(0.5, 5)));
    bush.castShadow = true;
    bush.receiveShadow = true;
    group.add(bush);
  }

  // Home base marker (animal camp)
  const baseGroup = new THREE.Group();
  baseGroup.position.set(BASE_X, 0, 0);
  const campGeo = new THREE.CylinderGeometry(1.6, 1.9, 0.5, 8);
  const campMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9, flatShading: true });
  const camp = new THREE.Mesh(campGeo, campMat);
  camp.position.y = 0.25;
  camp.castShadow = true;
  camp.receiveShadow = true;
  baseGroup.add(camp);
  for (let i = 0; i < 4; i++) {
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 5);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5a4326, roughness: 1 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    const a = (i / 4) * Math.PI * 2;
    pole.position.set(Math.cos(a) * 1.5, 0.9, Math.sin(a) * 1.5);
    pole.castShadow = true;
    baseGroup.add(pole);
  }
  const totemGeo = new THREE.ConeGeometry(0.35, 1.2, 6);
  const totemMat = new THREE.MeshStandardMaterial({ color: 0xd98b3f, emissive: 0xff8a3f, emissiveIntensity: 0.5, roughness: 0.6, flatShading: true });
  const totem = new THREE.Mesh(totemGeo, totemMat);
  totem.position.y = 1.1;
  totem.castShadow = true;
  baseGroup.add(totem);
  group.add(baseGroup);

  // ---------------- Lighting ----------------
  const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x35301f, 0.65);
  group.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe3b0, 2.4);
  sun.position.set(-10, 22, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const shadowExtent = Math.max(width, depth) * 0.6;
  sun.shadow.camera.left = -shadowExtent;
  sun.shadow.camera.right = shadowExtent;
  sun.shadow.camera.top = shadowExtent;
  sun.shadow.camera.bottom = -shadowExtent;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0015;
  sun.shadow.normalBias = 0.02;
  sun.target.position.set(colToX((COLS - 1) / 2), 0, 0);
  group.add(sun);
  group.add(sun.target);

  const rim = new THREE.DirectionalLight(0x9d5cff, 0.9);
  rim.position.set(colToX(COLS) + 6, 10, -8);
  group.add(rim);

  const fill = new THREE.PointLight(0x66ffcc, 0.4, 30);
  fill.position.set(BASE_X, 3, 0);
  group.add(fill);

  const ambient = new THREE.AmbientLight(0x404060, 0.3);
  group.add(ambient);

  let t = 0;
  return {
    group,
    sun,
    update(dt: number, elapsed: number) {
      t = elapsed;
      shipGroup.children.forEach((ship, i) => {
        const baseY = (ship.userData.baseY as number) ?? ship.position.y;
        ship.position.y = baseY + Math.sin(t * 0.3 + i) * 0.4;
        ship.rotation.y += dt * 0.05;
      });
      stars.rotation.y += dt * 0.002;
      (fill as THREE.PointLight).intensity = 0.4 + Math.sin(t * 2) * 0.08;
    },
  };
}

export { rowToZ };
