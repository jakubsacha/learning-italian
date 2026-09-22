/**
 * Łączenie postępu z dwóch urządzeń. Zasada: dla każdego słowa wygrywa karta
 * dalej w nauce, dla każdego dnia większa liczba zrobionych fiszek. Dzięki temu
 * nauka na telefonie i na komputerze tego samego dnia niczego nie kasuje.
 */

import type { DailyCounts, Progress, Review } from "./types.js";

/** Która z dwóch wersji jednego słowa jest „dalej": więcej powtórek, a przy remisie późniejszy termin. */
const ahead = (a: Review, b: Review): Review =>
  b.reps > a.reps || (b.reps === a.reps && b.due > a.due) ? b : a;

export function mergeProgress(mine: Progress, theirs: Progress): Progress {
  const out = new Map(mine);
  for (const [id, review] of theirs) {
    const current = out.get(id);
    out.set(id, current === undefined ? review : ahead(current, review));
  }
  return out;
}

export function mergeCounts(mine: DailyCounts, theirs: DailyCounts): DailyCounts {
  const out = new Map(mine);
  for (const [key, count] of theirs) out.set(key, Math.max(out.get(key) ?? 0, count));
  return out;
}
