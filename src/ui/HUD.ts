import type { DefenderStats } from '../entities/Defender';

export interface HUDCallbacks {
  onSelect: (id: string | null) => void;
  onOpenSettings: () => void;
  onRestart: () => void;
}

interface CardEls {
  root: HTMLDivElement;
  cooldown: HTMLDivElement;
  cost: HTMLDivElement;
}

export class HUD {
  readonly root: HTMLDivElement;
  private energyValue: HTMLDivElement;
  private waveTitle: HTMLDivElement;
  private waveSub: HTMLDivElement;
  private healthFill: HTMLDivElement;
  private tray: HTMLDivElement;
  private toastWrap: HTMLDivElement;
  private endOverlay: HTMLDivElement | null = null;
  private cards = new Map<string, CardEls>();
  private selectedId: string | null = null;

  constructor(container: HTMLElement, roster: DefenderStats[], private callbacks: HUDCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    container.appendChild(this.root);

    // top bar
    const topbar = document.createElement('div');
    topbar.className = 'topbar';
    this.root.appendChild(topbar);

    const energyChip = document.createElement('div');
    energyChip.className = 'energy-chip';
    energyChip.innerHTML = `<div class="energy-icon"></div>`;
    this.energyValue = document.createElement('div');
    this.energyValue.className = 'energy-value';
    this.energyValue.textContent = '150';
    energyChip.appendChild(this.energyValue);
    topbar.appendChild(energyChip);

    const wavePanel = document.createElement('div');
    wavePanel.className = 'wave-panel';
    this.waveTitle = document.createElement('div');
    this.waveTitle.className = 'wave-title';
    this.waveTitle.textContent = 'Preparando defensas';
    this.waveSub = document.createElement('div');
    this.waveSub.className = 'wave-sub';
    this.waveSub.textContent = '';
    wavePanel.append(this.waveTitle, this.waveSub);
    topbar.appendChild(wavePanel);

    const settingsBtn = document.createElement('div');
    settingsBtn.className = 'icon-btn';
    settingsBtn.textContent = '⚙️';
    settingsBtn.addEventListener('click', () => this.callbacks.onOpenSettings());
    topbar.appendChild(settingsBtn);

    // base health
    const baseHealth = document.createElement('div');
    baseHealth.className = 'base-health';
    baseHealth.innerHTML = `<div class="base-health-label">Campamento</div><div class="base-health-bar-bg"><div class="base-health-bar-fill" style="width:100%"></div></div>`;
    this.root.appendChild(baseHealth);
    this.healthFill = baseHealth.querySelector('.base-health-bar-fill')!;

    // toasts
    this.toastWrap = document.createElement('div');
    this.toastWrap.className = 'toast-wrap';
    this.root.appendChild(this.toastWrap);

    // hint
    const hint = document.createElement('div');
    hint.className = 'crosshair-hint';
    hint.textContent = 'Elige un animal y haz clic en el terreno · Recoge la energía brillante';
    this.root.appendChild(hint);

    // tray
    this.tray = document.createElement('div');
    this.tray.className = 'tray';
    this.root.appendChild(this.tray);
    roster.forEach((stats) => this.buildCard(stats));
  }

  private buildCard(stats: DefenderStats) {
    const card = document.createElement('div');
    card.className = 'card';
    card.title = stats.description;
    card.innerHTML = `
      <div class="card-emoji">${stats.icon}</div>
      <div class="card-name">${stats.name}</div>
      <div class="card-cost">${stats.cost}</div>
      <div class="card-cooldown" style="display:none"></div>
    `;
    card.addEventListener('click', () => {
      if (card.classList.contains('disabled')) return;
      const next = this.selectedId === stats.id ? null : stats.id;
      this.setSelected(next);
      this.callbacks.onSelect(next);
    });
    this.tray.appendChild(card);
    this.cards.set(stats.id, {
      root: card,
      cooldown: card.querySelector('.card-cooldown')!,
      cost: card.querySelector('.card-cost')!,
    });
  }

  setSelected(id: string | null) {
    this.selectedId = id;
    this.cards.forEach((c, key) => c.root.classList.toggle('selected', key === id));
  }

  setEnergy(value: number) {
    this.energyValue.textContent = Math.floor(value).toString();
  }

  setCardAffordable(id: string, affordable: boolean, cooldownPct: number) {
    const c = this.cards.get(id);
    if (!c) return;
    const locked = !affordable || cooldownPct > 0;
    c.root.classList.toggle('disabled', locked);
    if (cooldownPct > 0) {
      c.cooldown.style.display = 'flex';
      c.cooldown.style.background = `conic-gradient(rgba(5,8,14,0.85) ${(1 - cooldownPct) * 360}deg, rgba(5,8,14,0.35) 0deg)`;
    } else {
      c.cooldown.style.display = 'none';
    }
  }

  setWave(title: string, sub: string) {
    this.waveTitle.textContent = title;
    this.waveSub.textContent = sub;
  }

  setBaseHealth(pct: number) {
    this.healthFill.style.width = `${Math.max(0, pct) * 100}%`;
  }

  toast(message: string) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    this.toastWrap.appendChild(el);
    setTimeout(() => el.remove(), 1650);
  }

  showEnd(win: boolean) {
    this.endOverlay = document.createElement('div');
    this.endOverlay.className = 'end-overlay';
    this.endOverlay.innerHTML = `
      <div class="end-card">
        <div class="end-title ${win ? 'win' : 'lose'}">${win ? 'NIVEL SUPERADO' : 'CAMPAMENTO PERDIDO'}</div>
        <div class="end-sub">${win ? 'Los animales han repelido la invasión alienígena.' : 'Los aliens han invadido el campamento.'}</div>
        <button class="end-btn">Reintentar</button>
      </div>
    `;
    this.endOverlay.querySelector('.end-btn')!.addEventListener('click', () => this.callbacks.onRestart());
    this.root.appendChild(this.endOverlay);
  }

  hideEnd() {
    this.endOverlay?.remove();
    this.endOverlay = null;
  }
}
