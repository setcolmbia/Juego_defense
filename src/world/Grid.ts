import * as THREE from 'three';
import { COLS, ROWS, TILE, colToX, rowToZ } from './GridConfig';

const CELL_INSET = 0.92;

interface Cell {
  col: number;
  row: number;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
}

/**
 * The planting grid, rendered Plants-vs-Zombies style: every cell is an
 * explicit, visible tile so the player can always tell exactly how much space
 * a defender takes and where it is legal to drop one. Cells light up while a
 * card is selected, and the hovered cell reads green (free) or red (blocked).
 */
export class Grid {
  readonly group = new THREE.Group();
  readonly plane: THREE.Mesh;
  readonly occupied: boolean[][]; // [col][row]

  private cells: Cell[] = [];
  private cellLookup = new Map<string, Cell>();
  private hoverRing: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private placementMode = false;
  private hovered: { col: number; row: number } | null = null;
  private pulseT = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);

    // Invisible raycast target covering the whole board.
    const planeGeo = new THREE.PlaneGeometry(COLS * TILE, ROWS * TILE);
    planeGeo.rotateX(-Math.PI / 2);
    this.plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ visible: false }));
    this.plane.position.set(colToX((COLS - 1) / 2), 0.02, 0);
    this.group.add(this.plane);

    this.occupied = Array.from({ length: COLS }, () => Array(ROWS).fill(false));
    this.buildCells();

    // Hover marker: a bright framed tile that snaps to the hovered cell.
    const ringGeo = new THREE.RingGeometry(TILE * 0.34, TILE * 0.46, 4);
    ringGeo.rotateX(-Math.PI / 2);
    ringGeo.rotateY(Math.PI / 4);
    this.hoverRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0x9dff6b, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.hoverRing.position.y = 0.12;
    this.hoverRing.visible = false;
    this.group.add(this.hoverRing);
  }

  private buildCells() {
    const cellGeo = new THREE.BoxGeometry(TILE * CELL_INSET, 0.09, TILE * CELL_INSET);
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        // Checkerboard shading, like a mown lawn, so cell boundaries read
        // instantly even without the hover highlight.
        const light = (col + row) % 2 === 0;
        const baseColor = new THREE.Color(light ? 0x6f9c3f : 0x5d8834);
        const material = new THREE.MeshStandardMaterial({
          color: baseColor.clone(),
          roughness: 0.92,
          metalness: 0.02,
          transparent: true,
          opacity: 0.85,
        });
        const mesh = new THREE.Mesh(cellGeo, material);
        mesh.position.set(colToX(col), 0.045, rowToZ(row));
        mesh.receiveShadow = true;
        this.group.add(mesh);

        const cell: Cell = { col, row, mesh, material, baseColor };
        this.cells.push(cell);
        this.cellLookup.set(`${col},${row}`, cell);
      }
    }

    // Crisp border lines around every cell.
    const points: THREE.Vector3[] = [];
    const half = (TILE * CELL_INSET) / 2;
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const x = colToX(col);
        const z = rowToZ(row);
        const corners = [
          new THREE.Vector3(x - half, 0.1, z - half),
          new THREE.Vector3(x + half, 0.1, z - half),
          new THREE.Vector3(x + half, 0.1, z + half),
          new THREE.Vector3(x - half, 0.1, z + half),
        ];
        for (let i = 0; i < 4; i++) {
          points.push(corners[i], corners[(i + 1) % 4]);
        }
      }
    }
    const borderGeo = new THREE.BufferGeometry().setFromPoints(points);
    const borderMat = new THREE.LineBasicMaterial({ color: 0xe8f5cf, transparent: true, opacity: 0.28 });
    this.group.add(new THREE.LineSegments(borderGeo, borderMat));
  }

  /** Called when the player picks / drops a defender card. */
  setPlacementMode(active: boolean) {
    this.placementMode = active;
    if (!active) {
      this.hovered = null;
      this.hoverRing.visible = false;
    }
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
    this.hovered = tile;
    if (!tile) {
      this.hoverRing.visible = false;
      return;
    }
    this.hoverRing.visible = true;
    this.hoverRing.position.x = colToX(tile.col);
    this.hoverRing.position.z = rowToZ(tile.row);
    (this.hoverRing.material as THREE.MeshBasicMaterial).color.set(valid ? 0x9dff6b : 0xff5f5f);
  }

  isFree(col: number, row: number): boolean {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return !this.occupied[col][row];
  }

  setOccupied(col: number, row: number, val: boolean) {
    this.occupied[col][row] = val;
  }

  update(dt: number) {
    this.pulseT += dt;
    const pulse = 0.5 + Math.sin(this.pulseT * 3) * 0.5;

    for (const cell of this.cells) {
      const free = !this.occupied[cell.col][cell.row];
      const isHovered = this.hovered?.col === cell.col && this.hovered?.row === cell.row;

      if (this.placementMode && free) {
        // Free cells glow softly while placing, so the playable space is obvious.
        const lift = isHovered ? 1 : 0.35 + pulse * 0.18;
        cell.material.color.copy(cell.baseColor).lerp(new THREE.Color(0x9dff6b), 0.18 + lift * 0.3);
        cell.material.opacity = 0.95;
        cell.mesh.position.y = 0.045 + (isHovered ? 0.06 : 0);
      } else if (this.placementMode && isHovered) {
        cell.material.color.copy(cell.baseColor).lerp(new THREE.Color(0xff5f5f), 0.5);
        cell.material.opacity = 0.95;
        cell.mesh.position.y = 0.045;
      } else {
        cell.material.color.copy(cell.baseColor);
        cell.material.opacity = 0.85;
        cell.mesh.position.y = 0.045;
      }
    }

    if (this.hoverRing.visible) {
      this.hoverRing.rotation.y += dt * 1.2;
      this.hoverRing.scale.setScalar(1 + Math.sin(this.pulseT * 6) * 0.05);
    }
  }
}
