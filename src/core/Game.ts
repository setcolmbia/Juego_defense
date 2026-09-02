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
import { colToX } from '../world/GridConfig';

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
      onSelect: (id) => {
        this.selectedAnimalId = id;
      },
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
    const centerX = colToX(3.6);
    this.sceneManager.camera.position.set(colToX(-1.4), 9.4, 16.5);
    this.sceneManager.camera.lookAt(centerX, 0.9, 0);
    this.cameraBase.pos.copy(this.sceneManager.camera.position);
    this.cameraBase.look.set(centerX, 1.1, 0);
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
      if (this.settingsPanel.isOpen()) {
        this.grid.setHover(null, true);
        return;
      }
      if (!this.selectedAnimalId) {
        this.grid.setHover(null, true);
        return;
      }
      const tile = this.grid.raycastTile(ndc, this.sceneManager.camera);
      const valid = !!tile && this.grid.isFree(tile.col, tile.row);
      this.grid.setHover(tile, valid);
    });

    this.input.onClick((ndc) => {
      if (this.ended || this.settingsPanel.isOpen()) return;

      const orb = this.economy.tryCollect(ndc, this.sceneManager.camera);
      if (orb) {
        this.audio.playCollect();
        this.particles.collectSparkle(orb.position.clone());
        return;
      }

      if (!this.selectedAnimalId) return;
      const stats = getAnimal(this.selectedAnimalId);
      const tile = this.grid.raycastTile(ndc, this.sceneManager.camera);
      if (!tile) return;
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
      this.hud.setSelected(null);
      this.selectedAnimalId = null;
      this.grid.setHover(null, true);
    });
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
