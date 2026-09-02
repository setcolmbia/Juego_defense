import * as THREE from 'three';

export class InputManager {
  readonly pointerNDC = new THREE.Vector2(-10, -10);
  private clickCallbacks: ((ndc: THREE.Vector2) => void)[] = [];
  private moveCallbacks: ((ndc: THREE.Vector2) => void)[] = [];

  constructor(private readonly target: HTMLElement) {
    target.addEventListener('pointermove', (e) => this.onPointerMove(e));
    target.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    target.addEventListener('pointerleave', () => {
      this.pointerNDC.set(-10, -10);
    });
  }

  onClick(cb: (ndc: THREE.Vector2) => void) {
    this.clickCallbacks.push(cb);
  }

  onMove(cb: (ndc: THREE.Vector2) => void) {
    this.moveCallbacks.push(cb);
  }

  private toNDC(e: PointerEvent): THREE.Vector2 {
    const rect = this.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return new THREE.Vector2(x, y);
  }

  private onPointerMove(e: PointerEvent) {
    this.pointerNDC.copy(this.toNDC(e));
    for (const cb of this.moveCallbacks) cb(this.pointerNDC);
  }

  private onPointerDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('.ui-blocker')) return;
    const ndc = this.toNDC(e);
    for (const cb of this.clickCallbacks) cb(ndc);
  }
}
