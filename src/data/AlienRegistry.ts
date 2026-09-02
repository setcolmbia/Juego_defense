import type { AlienStats } from '../entities/Alien';
import { Scuttler } from './aliens/scuttler';
import { Brute } from './aliens/brute';
import { Reaper } from './aliens/reaper';
import { Hunter } from './aliens/hunter';
import { Overlord } from './aliens/overlord';

export const ALIEN_ROSTER: AlienStats[] = [Scuttler, Brute, Reaper, Hunter, Overlord];

export function getAlien(id: string): AlienStats {
  const found = ALIEN_ROSTER.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown alien id: ${id}`);
  return found;
}
