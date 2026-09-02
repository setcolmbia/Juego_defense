import type { DefenderStats } from '../entities/Defender';
import { Porcupine } from './animals/porcupine';
import { Rhino } from './animals/rhino';
import { Meerkat } from './animals/meerkat';
import { Eagle } from './animals/eagle';
import { Elephant } from './animals/elephant';

export const ANIMAL_ROSTER: DefenderStats[] = [Meerkat, Porcupine, Eagle, Rhino, Elephant];

export function getAnimal(id: string): DefenderStats {
  const found = ANIMAL_ROSTER.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown animal id: ${id}`);
  return found;
}
