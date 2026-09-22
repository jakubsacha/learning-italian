/**
 * Tablica wyników i wspólny cel. Celowo nie jest to wyścig: liczy się suma
 * całej dwójki, a wspólna seria łamie się dopiero, gdy razem nie wyrobicie celu.
 */

import type { BoardRow, DailyCounts, DateKey } from "./types.js";
import { dateKeyOf, streakLength } from "./day.js";

export type SharedGoal = {
  readonly target: number;
  readonly total: number;
  readonly done: boolean;
  readonly streak: number;
};

export const boardRows = (rows: readonly BoardRow[]): readonly BoardRow[] =>
  rows.slice().sort((a, b) => b.today - a.today || b.mature - a.mature);

export function sharedGoal(
  everyone: readonly DailyCounts[],
  now: Date,
  target: number,
): SharedGoal {
  const summed = new Map<DateKey, number>();
  for (const counts of everyone) {
    for (const [key, count] of counts) summed.set(key, (summed.get(key) ?? 0) + count);
  }
  const total = summed.get(dateKeyOf(now)) ?? 0;
  return {
    target,
    total,
    done: total >= target,
    streak: streakLength(summed, now, (count) => count >= target),
  };
}
