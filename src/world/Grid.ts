import * as THREE from 'three';
import { COLS, ROWS, TILE, colToX, rowToZ } from './GridConfig';

export class Grid {
  readonly plane: THREE.Mesh;
  readonly hoverTile: THREE.Mesh;
  readonly occupied: (boolean)[][]; // [col][row]
  private raycaster = new THREE.Raycaster();

  constructor(scene: THREE.Scene) {
    const planeGeo = new THREE.PlaneGeometry((COLS + 4) * TILE, (ROWS + 2) * TILE);
    planeGeo.rotateX(-Math.PI / 2);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false });
    this.plane = new THREE.Mesh(planeGeo, planeMat);
    this.plane.position.set(colToX((COLS - 1) / 2), 0.01, 0);
    scene.add(this.plane);

    const hoverGeo = new THREE.PlaneGeometry(TILE * 0.92, TILE * 0.92);
    hoverGeo.rotateX(-Math.PI / 2);
    const hoverMat = new THREE.MeshBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.35, depthWrite: false });
    this.hoverTile = new THREE.Mesh(hoverGeo, hoverMat);
    this.hoverTile.position.y = 0.05;
    this.hoverTile.visible = false;
    scene.add(this.hoverTile);

    this.occupied = Array.from({ length: COLS }, () => Array(ROWS).fill(false));
  }

  raycastTile(ndc: THREE.Vector2, camera: THREE.Camera): { col: number; row: number } | null {
    this.raycaster.setFromCamera(ndc, camera);
    const hit = this.raycaster.intersectObject(this.plane, false)[0];
    if (!hit) return null;
    const col = Math.round(hit.point.x / TILE);
    const row = Math.round(hit.point.z / TILE + (ROWS - 1) / 2);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { col, row };
  }

  setHover(tile: { col: number; row: number } | null, valid: boolean) {
    if (!tile) {
      this.hoverTile.visible = false;
      return;
    }
    this.hoverTile.visible = true;
    this.hoverTile.position.x = colToX(tile.col);
    this.hoverTile.position.z = rowToZ(tile.row);
    (this.hoverTile.material as THREE.MeshBasicMaterial).color.set(valid ? 0x7dffb0 : 0xff6b6b);
  }

  isFree(col: number, row: number): boolean {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return !this.occupied[col][row];
  }

  setOccupied(col: number, row: number, val: boolean) {
    this.occupied[col][row] = val;
  }
}
