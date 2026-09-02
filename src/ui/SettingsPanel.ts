import type { GameSettings, Quality } from '../core/Settings';

export interface SettingsCallbacks {
  onChange: (settings: GameSettings) => void;
  onClose: () => void;
}

export class SettingsPanel {
  private overlay: HTMLDivElement | null = null;

  constructor(
    private container: HTMLElement,
    private settings: GameSettings,
    private callbacks: SettingsCallbacks,
  ) {}

  isOpen() {
    return this.overlay !== null;
  }

  open() {
    if (this.overlay) return;
    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.innerHTML = `
      <div class="settings-panel">
        <h2>Configuración</h2>

        <div class="settings-row">
          <label>Calidad gráfica</label>
          <div class="seg" data-key="quality">
            <button data-val="low">Baja</button>
            <button data-val="medium">Media</button>
            <button data-val="high">Alta</button>
          </div>
        </div>

        <div class="settings-row">
          <label>Sombras</label>
          <input type="checkbox" data-key="shadows" />
        </div>
        <div class="settings-row">
          <label>Resplandor (bloom)</label>
          <input type="checkbox" data-key="bloom" />
        </div>
        <div class="settings-row">
          <label>Oclusión ambiental</label>
          <input type="checkbox" data-key="ssao" />
        </div>
        <div class="settings-row">
          <label>Densidad de partículas</label>
          <input type="range" min="0" max="1" step="0.1" data-key="particleDensity" />
        </div>

        <div class="settings-row">
          <label>Volumen general</label>
          <input type="range" min="0" max="1" step="0.05" data-key="master" />
        </div>
        <div class="settings-row">
          <label>Música</label>
          <input type="range" min="0" max="1" step="0.05" data-key="music" />
        </div>
        <div class="settings-row">
          <label>Efectos</label>
          <input type="range" min="0" max="1" step="0.05" data-key="sfx" />
        </div>
        <div class="settings-row">
          <label>Silenciar</label>
          <input type="checkbox" data-key="muted" />
        </div>

        <button class="settings-close">Cerrar</button>
      </div>
    `;
    this.container.appendChild(overlay);
    this.overlay = overlay;
    this.bind();
    this.syncUI();
  }

  close() {
    this.overlay?.remove();
    this.overlay = null;
    this.callbacks.onClose();
  }

  private bind() {
    if (!this.overlay) return;
    const qualBtns = this.overlay.querySelectorAll('[data-key="quality"] button');
    qualBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.settings.graphics.quality = (btn as HTMLElement).dataset.val as Quality;
        this.syncUI();
        this.callbacks.onChange(this.settings);
      });
    });

    const bindCheck = (key: keyof typeof this.settings.graphics | keyof typeof this.settings.audio, group: 'graphics' | 'audio') => {
      const el = this.overlay!.querySelector(`input[data-key="${key}"]`) as HTMLInputElement | null;
      if (!el) return;
      el.addEventListener('input', () => {
        const target = group === 'graphics' ? this.settings.graphics : this.settings.audio;
        (target as unknown as Record<string, unknown>)[key as string] = el.type === 'checkbox' ? el.checked : Number(el.value);
        this.callbacks.onChange(this.settings);
      });
    };

    bindCheck('shadows', 'graphics');
    bindCheck('bloom', 'graphics');
    bindCheck('ssao', 'graphics');
    bindCheck('particleDensity', 'graphics');
    bindCheck('master', 'audio');
    bindCheck('music', 'audio');
    bindCheck('sfx', 'audio');
    bindCheck('muted', 'audio');

    this.overlay.querySelector('.settings-close')!.addEventListener('click', () => this.close());
  }

  private syncUI() {
    if (!this.overlay) return;
    const g = this.settings.graphics;
    const a = this.settings.audio;
    this.overlay.querySelectorAll('[data-key="quality"] button').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.val === g.quality);
    });
    (this.overlay.querySelector('input[data-key="shadows"]') as HTMLInputElement).checked = g.shadows;
    (this.overlay.querySelector('input[data-key="bloom"]') as HTMLInputElement).checked = g.bloom;
    (this.overlay.querySelector('input[data-key="ssao"]') as HTMLInputElement).checked = g.ssao;
    (this.overlay.querySelector('input[data-key="particleDensity"]') as HTMLInputElement).value = String(g.particleDensity);
    (this.overlay.querySelector('input[data-key="master"]') as HTMLInputElement).value = String(a.master);
    (this.overlay.querySelector('input[data-key="music"]') as HTMLInputElement).value = String(a.music);
    (this.overlay.querySelector('input[data-key="sfx"]') as HTMLInputElement).value = String(a.sfx);
    (this.overlay.querySelector('input[data-key="muted"]') as HTMLInputElement).checked = a.muted;
  }
}
