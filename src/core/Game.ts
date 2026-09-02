import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';
import { loadSettings, saveSettings, type GameSettings } from './Settings';
import { buildEnvironment, type EnvironmentHandles } from '../world/Environment';
import { Grid } from '../world/Grid';
import { ParticleSystem } from '../vfx/Particles';
import { DebrisSystem } from '../vfx/Debris';
import { EconomyManager } from '../systems/EconomyManager';
import { CombatSystem } from '../systems/CombatSystem';
import { SpawnManager } from '../systems/SpawnManager';
import { HUD } from '../ui/HUD';
import { SettingsPanel } from '../ui/SettingsPanel';
import { ANIMAL_ROSTER, getAnimal } from '../data/AnimalRegistry';
import { getAlien } from '../data/AlienRegistry';
import { LEVEL1_WAVES, LEVEL1_NAME } from '../data/Level1';
import { colToX, rowToZ, COLS, TILE } from '../world/GridConfig';
import { computeFitScale } from '../render/CreatureBuilder';

const BASE_MAX_HEALTH = 100;

export class Game {
  private sceneManager: SceneManager;
  private input: InputManager;
  private audio: AudioManager;
  private settings: GameSettings;
  private env: EnvironmentHandles;
  private grid: Grid;
  private particles: ParticleSystem;
  private debris: DebrisSystem;
  private economy: EconomyManager;
  private combat: CombatSystem;
  private spawn: SpawnManager;
  private hud: HUD;
  private settingsPanel: SettingsPanel;

  private selectedAnimalId: string | null = null;
  private ghost: THREE.Group | null = null;
  private ghostMeshes: THREE.Mesh[] = [];
  private dragPointerId: number | null = null;
  private dragMoved = false;
  private cooldowns = new Map<string, number>();
  private baseHealth = BASE_MAX_HEALTH;
  private clock = new THREE.Clock();
  private ended = false;
  private cameraBase = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private mouseParallax = new THREE.Vector2();

  constructor(private container: HTMLElement) {
    this.settings = loadSettings();
    this.sceneManager = new SceneManager(container);
    this.input = new InputManager(this.sceneManager.canvas);
    this.audio = new AudioManager(this.settings.audio);

    this.env = buildEnvironment(this.sceneManager.scene);
    this.grid = new Grid(this.sceneManager.scene);
    this.particles = new ParticleSystem(this.sceneManager.scene);
    this.debris = new DebrisSystem(this.sceneManager.scene);
    this.economy = new EconomyManager(this.sceneManager.scene);

    this.combat = new CombatSystem(this.sceneManager.scene, this.grid, this.particles, this.debris, this.audio, this.economy, {
      onBaseHit: (dmg) => this.damageBase(dmg),
      onDefenderLost: () => {},
    });

    this.spawn = new SpawnManager(LEVEL1_WAVES, this.combat);
    this.spawn.onWaveStart = (i, label) => {
      this.audio.playWaveStart();
      this.hud.setWave(label, `Oleada ${i + 1} de ${this.spawn.totalWaves}`);
      this.hud.toast(`⚠ ${label}`);
    };
    this.spawn.onWaveClear = (i) => {
      this.hud.toast(`Oleada ${i + 1} superada`);
    };
    this.spawn.onIntermissionTick = (secondsLeft) => {
      if (this.spawn.phase !== 'intermission' || this.ended) return;
      const idx = this.spawn.waveIndex + 1;
      this.hud.setWave(idx === 0 ? LEVEL1_NAME : `Preparando oleada ${idx + 1}`, secondsLeft > 0 ? `Comienza en ${Math.ceil(secondsLeft)}s` : '');
    };
    this.spawn.onAllWavesClear = () => this.win();

    this.hud = new HUD(container, ANIMAL_ROSTER, {
      onSelect: (id) => this.selectAnimal(id),
      onDragStart: (id) => this.selectAnimal(id, true),
      onOpenSettings: () => this.settingsPanel.open(),
      onRestart: () => window.location.reload(),
    });
    this.hud.setWave(LEVEL1_NAME, `Comienza en ${Math.ceil(LEVEL1_WAVES[0].intermission)}s`);
    this.hud.setEnergy(this.economy.energy);
    this.economy.onChange = () => this.hud.setEnergy(this.economy.energy);

    this.settingsPanel = new SettingsPanel(container, this.settings, {
      onChange: (s) => this.applySettings(s),
      onClose: () => {},
    });
    this.applySettings(this.settings);

    this.setupCamera();
    this.wireInput();

    window.addEventListener('pointerdown', () => this.audio.startAmbientMusic(), { once: true });

    if (import.meta.env.DEV) this.exposeDebugAPI();
  }

  /**
   * Dev-only console API for QA/testing — lets automated scripts spawn any
   * unit or skip waits instantly instead of playing through real timers.
   * Stripped in production builds via the import.meta.env.DEV guard above.
   */
  private exposeDebugAPI() {
    (window as unknown as { __debug: Record<string, unknown> }).__debug = {
      spawnAlien: (id: string, row = 2, xOffset = 0) => this.combat.spawnAlien(getAlien(id), row, xOffset),
      placeAnimal: (id: string, col = 3, row = 2) => {
        const stats = getAnimal(id);
        if (!this.grid.isFree(col, row)) return null;
        this.grid.setOccupied(col, row, true);
        return this.combat.addDefender(stats, col, row);
      },
      giveEnergy: (amount = 500) => this.economy.add(amount),
      spawnOrb: (col = 3, row = 2, amount = 25) => this.economy.spawnManualOrb(colToX(col), rowToZ(row), amount),
      /** Orb positions projected to CSS pixel coords, for click-path testing. */
      orbScreenPositions: () => {
        const rect = this.sceneManager.canvas.getBoundingClientRect();
        return this.economy.orbs.map((orb) => {
          const p = orb.position.clone().project(this.sceneManager.camera);
          return {
            x: rect.left + ((p.x + 1) / 2) * rect.width,
            y: rect.top + ((1 - p.y) / 2) * rect.height,
          };
        });
      },
      listAnimals: () => ANIMAL_ROSTER.map((a) => a.id),
      listAliens: () => ['scuttler', 'brute', 'hunter', 'reaper', 'overlord'],
      forceWin: () => this.win(),
      forceLose: () => this.lose(),
      state: () => ({
        energy: this.economy.energy,
        baseHealth: this.baseHealth,
        wave: this.spawn.waveIndex,
        phase: this.spawn.phase,
        defenders: this.combat.defenders.map((d) => ({ id: d.stats.id, col: d.col, row: d.row, hp: d.hp, attackTimer: d.attackTimer })),
        aliens: this.combat.aliens.map((a) => ({ id: a.stats.id, row: a.row, x: a.x, hp: a.hp, dying: a.isDying })),
        projectiles: this.combat.projectiles.length,
      }),
    };
  }

  private setupCamera() {
    // Plants-vs-Zombies framing: the camera sits in front of the lawn looking
    // straight down the row axis, so lanes run left-to-right across the screen
    // (base on the left, aliens marching in from the right) and every unit is
    // seen in side profile. Elevated ~27° for readability without turning it
    // into a confusing corner/isometric view.
    const centerX = colToX((COLS - 1) / 2);
    this.sceneManager.camera.position.set(centerX - 0.6, 8.2, 15.8);
    this.sceneManager.camera.lookAt(centerX, 0.8, 0);
    this.cameraBase.pos.copy(this.sceneManager.camera.position);
    this.cameraBase.look.set(centerX, 0.8, 0);
  }

  private applySettings(s: GameSettings) {
    this.settings = s;
    saveSettings(s);
    this.sceneManager.applyGraphicsSettings(s.graphics);
    this.particles.setDensity(s.graphics.particleDensity);
    this.debris.setDensity(s.graphics.particleDensity);
    this.audio.applySettings(s.audio);
  }

  private wireInput() {
    this.input.onMove((ndc) => {
      this.mouseParallax.set(ndc.x, ndc.y);
      this.updateHoverFromNDC(ndc);
    });

    this.input.onClick((ndc) => {
      if (this.ended || this.settingsPanel.isOpen()) return;

      const orb = this.economy.tryCollect(ndc, this.sceneManager.camera);
      if (orb) {
        this.audio.playCollect();
        this.particles.collectSparkle(orb.position.clone());
        return;
      }

      // Second click of the click-card-then-click-cell flow.
      if (this.selectedAnimalId) this.tryPlaceAt(ndc);
    });

    // Drag-and-drop: the pointer leaves the card and is tracked at the document
    // level, so the ghost keeps following it over the canvas and a release on a
    // valid cell plants the defender.
    document.addEventListener('pointermove', (e) => {
      if (!this.selectedAnimalId) return;
      const ndc = this.eventToNDC(e);
      if (!ndc) return;
      if (this.dragPointerId !== null) this.dragMoved = true;
      this.updateHoverFromNDC(ndc);
    });

    document.addEventListener('pointerup', (e) => {
      if (this.dragPointerId === null) return;
      this.dragPointerId = null;
      if (!this.selectedAnimalId) return;
      // A click without movement keeps the card armed for the click-click flow.
      if (!this.dragMoved) return;
      const ndc = this.eventToNDC(e);
      if (ndc) this.tryPlaceAt(ndc);
      else this.cancelPlacement();
    });

    // Escape / right-click cancels an armed card.
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.selectedAnimalId) this.cancelPlacement();
    });
    this.sceneManager.canvas.addEventListener('contextmenu', (e) => {
      if (this.selectedAnimalId) {
        e.preventDefault();
        this.cancelPlacement();
      }
    });
  }

  /** Converts a DOM pointer event to canvas NDC, or null if outside the canvas. */
  private eventToNDC(e: PointerEvent): THREE.Vector2 | null {
    const rect = this.sceneManager.canvas.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return null;
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private updateHoverFromNDC(ndc: THREE.Vector2) {
    if (this.settingsPanel.isOpen() || !this.selectedAnimalId) {
      this.grid.setHover(null, true);
      this.setGhostVisible(false);
      return;
    }
    const tile = this.grid.raycastTile(ndc, this.sceneManager.camera);
    const valid = !!tile && this.grid.isFree(tile.col, tile.row);
    this.grid.setHover(tile, valid);
    if (tile) {
      this.setGhostVisible(true);
      this.ghost?.position.set(colToX(tile.col), 0, rowToZ(tile.row));
      this.setGhostTint(valid);
    } else {
      this.setGhostVisible(false);
    }
  }

  /** Arms a defender card: builds the translucent placement ghost. */
  private selectAnimal(id: string | null, viaDrag = false) {
    this.selectedAnimalId = id;
    this.hud.setSelected(id);
    this.grid.setPlacementMode(!!id);
    this.disposeGhost();
    this.dragMoved = false;
    this.dragPointerId = viaDrag ? 1 : null;
    if (!id) {
      this.grid.setHover(null, true);
      return;
    }
    const stats = getAnimal(id);
    const rig = stats.buildModel();
    // Same clamp the real defender uses, so the preview matches what you get.
    rig.root.scale.setScalar(Math.min(stats.scale, computeFitScale(rig.root, TILE * 0.9, TILE * 0.95)));
    rig.allMeshes.forEach((m) => {
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      mat.transparent = true;
      mat.opacity = 0.45;
      mat.depthWrite = false;
      m.material = mat;
      m.castShadow = false;
      m.receiveShadow = false;
    });
    rig.root.visible = false;
    this.ghost = rig.root;
    this.ghostMeshes = rig.allMeshes;
    this.sceneManager.scene.add(this.ghost);
  }

  private setGhostVisible(visible: boolean) {
    if (this.ghost) this.ghost.visible = visible;
  }

  private setGhostTint(valid: boolean) {
    for (const m of this.ghostMeshes) {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.opacity = valid ? 0.5 : 0.28;
      mat.emissive?.setHex(valid ? 0x1d3d12 : 0x5a1111);
      mat.emissiveIntensity = 0.6;
    }
  }

  private disposeGhost() {
    if (!this.ghost) return;
    this.sceneManager.scene.remove(this.ghost);
    this.ghostMeshes.forEach((m) => (m.material as THREE.Material).dispose());
    this.ghost = null;
    this.ghostMeshes = [];
  }

  private cancelPlacement() {
    this.selectAnimal(null);
  }

  private tryPlaceAt(ndc: THREE.Vector2) {
    if (this.ended || !this.selectedAnimalId) return;
    const stats = getAnimal(this.selectedAnimalId);
    const tile = this.grid.raycastTile(ndc, this.sceneManager.camera);
    if (!tile) {
      this.cancelPlacement();
      return;
    }
    if (!this.grid.isFree(tile.col, tile.row)) {
      this.audio.playDenied();
      this.hud.toast('Casilla ocupada');
      return;
    }
    if (!this.economy.canAfford(stats.cost)) {
      this.audio.playDenied();
      this.hud.toast('Energía insuficiente');
      return;
    }
    if ((this.cooldowns.get(stats.id) ?? 0) > 0) {
      this.audio.playDenied();
      this.hud.toast('En recarga');
      return;
    }

    this.economy.spend(stats.cost);
    this.combat.addDefender(stats, tile.col, tile.row);
    this.cooldowns.set(stats.id, stats.cooldown);
    this.audio.playPlace();
    this.particles.collectSparkle(new THREE.Vector3(colToX(tile.col), 0.4, rowToZ(tile.row)), 0x9dff6b);
    this.selectAnimal(null);
  }

  private damageBase(amount: number) {
    this.baseHealth = Math.max(0, this.baseHealth - amount);
    this.hud.setBaseHealth(this.baseHealth / BASE_MAX_HEALTH);
    this.hud.toast('¡Un alien llegó al campamento!');
    if (this.baseHealth <= 0 && !this.ended) this.lose();
  }

  private win() {
    if (this.ended) return;
    this.ended = true;
    this.audio.playVictory();
    this.hud.showEnd(true);
  }

  private lose() {
    if (this.ended) return;
    this.ended = true;
    this.audio.playDefeat();
    this.hud.showEnd(false);
  }

  private updateHUDCards() {
    for (const stats of ANIMAL_ROSTER) {
      const cd = this.cooldowns.get(stats.id) ?? 0;
      const pct = cd > 0 ? cd / stats.cooldown : 0;
      const affordable = this.economy.canAfford(stats.cost);
      this.hud.setCardAffordable(stats.id, affordable, pct);
    }
  }

  private update(dt: number, elapsed: number) {
    this.env.update(dt, elapsed);
    this.grid.update(dt);
    this.economy.update(dt, true);
    if (!this.ended) this.combat.update(dt, elapsed);
    if (!this.ended) this.spawn.update(dt);
    this.particles.update(dt);
    this.debris.update(dt);

    for (const [id, t] of this.cooldowns) {
      const next = Math.max(0, t - dt);
      this.cooldowns.set(id, next);
    }
    this.updateHUDCards();

    // subtle cinematic camera parallax
    const targetOffsetX = this.mouseParallax.x * 0.6;
    const targetOffsetY = this.mouseParallax.y * 0.35;
    const cam = this.sceneManager.camera;
    const desired = this.cameraBase.pos.clone().add(new THREE.Vector3(targetOffsetX, targetOffsetY, 0));
    cam.position.lerp(desired, 1 - Math.pow(0.001, dt));
    cam.lookAt(this.cameraBase.look);
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const elapsed = this.clock.getElapsedTime();
      this.update(dt, elapsed);
      this.sceneManager.render();
    };
    loop();
  }
}
