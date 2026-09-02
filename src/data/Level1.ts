import type { WaveDefinition } from '../systems/SpawnManager';

export const LEVEL1_NAME = 'Savanna Outpost';

export const LEVEL1_WAVES: WaveDefinition[] = [
  {
    label: 'Oleada 1 — Exploradores',
    intermission: 10,
    events: [
      { alienId: 'scuttler', delay: 0 },
      { alienId: 'scuttler', delay: 3.5 },
      { alienId: 'scuttler', delay: 3.5 },
    ],
  },
  {
    label: 'Oleada 2 — Refuerzos',
    intermission: 14,
    events: [
      { alienId: 'scuttler', delay: 0 },
      { alienId: 'scuttler', delay: 2.2 },
      { alienId: 'brute', delay: 3 },
      { alienId: 'scuttler', delay: 2.5 },
      { alienId: 'scuttler', delay: 2 },
    ],
  },
  {
    label: 'Oleada 3 — Cazadores',
    intermission: 16,
    events: [
      { alienId: 'brute', delay: 0 },
      { alienId: 'hunter', delay: 2 },
      { alienId: 'scuttler', delay: 1.8 },
      { alienId: 'hunter', delay: 2.5 },
      { alienId: 'brute', delay: 2.5 },
      { alienId: 'scuttler', delay: 1.5 },
    ],
  },
  {
    label: 'Oleada 4 — Asalto Aéreo',
    intermission: 18,
    events: [
      { alienId: 'reaper', delay: 0 },
      { alienId: 'scuttler', delay: 1.5 },
      { alienId: 'hunter', delay: 2 },
      { alienId: 'reaper', delay: 2.5 },
      { alienId: 'brute', delay: 2 },
      { alienId: 'reaper', delay: 3 },
      { alienId: 'scuttler', delay: 1.5 },
    ],
  },
  {
    label: 'Oleada 5 — El Overlord',
    intermission: 20,
    events: [
      { alienId: 'scuttler', delay: 0 },
      { alienId: 'scuttler', delay: 1.5 },
      { alienId: 'hunter', delay: 2 },
      { alienId: 'reaper', delay: 2.5 },
      { alienId: 'brute', delay: 2.5 },
      { alienId: 'hunter', delay: 2 },
      { alienId: 'overlord', delay: 3.5 },
      { alienId: 'reaper', delay: 2.5 },
      { alienId: 'scuttler', delay: 2 },
    ],
  },
];
