/**
 * Postać zapisu postępu. Krótkie nazwy pól (`e`, `i`, `d`, `r`, `l`) zostają
 * bez zmian: te same dane leżą już w przeglądarkach i w bazie, a zmiana nazw
 * skasowałaby komuś naukę. Nazwy czytelne są w domenie, skróty na dysku.
 */

import type { DailyCounts, DateKey, Progress, Review, WordId } from "../domain/types.js";
import { asDateKey, asDayNumber, asDays, asWordId } from "../domain/types.js";
import { asFiniteNumber, asNonNegativeInt, isRecord } from "./codec.js";

export type StoredReview = {
  readonly e: number;
  readonly i: number;
  readonly d: number;
  readonly r: number;
  readonly l: number;
};

const DEFAULT_EASE = 2.5;

/** Jeden wpis; `null`, gdy nie da się go uratować. */
export function decodeReview(value: unknown): Review | null {
  if (!isRecord(value)) return null;
  const interval = asNonNegativeInt(value["i"]);
  const due = asFiniteNumber(value["d"]);
  if (interval === null || due === null) return null;
  return {
    ease: asFiniteNumber(value["e"]) ?? DEFAULT_EASE,
    interval: asDays(interval),
    due: asDayNumber(due),
    reps: asNonNegativeInt(value["r"]) ?? 0,
    lapses: asNonNegativeInt(value["l"]) ?? 0,
  };
}

export const encodeReview = (review: Review): StoredReview => ({
  e: review.ease,
  i: review.interval,
  d: review.due,
  r: review.reps,
  l: review.lapses,
});

export function decodeProgress(value: unknown): Progress {
  const out = new Map<WordId, Review>();
  if (!isRecord(value)) return out;
  for (const [id, entry] of Object.entries(value)) {
    const review = decodeReview(entry);
    if (review !== null) out.set(asWordId(id), review);
  }
  return out;
}

export const encodeProgress = (progress: Progress): Record<string, StoredReview> =>
  Object.fromEntries([...progress].map(([id, review]) => [id, encodeReview(review)]));

/** Stary format pudełkowy (Leitner 0..3) — jednorazowa migracja. */
const LEITNER_INTERVALS = [0, 1, 3, 7] as const;

export function migrateFromBoxes(value: unknown): Progress {
  const out = new Map<WordId, Review>();
  if (!isRecord(value)) return out;
  for (const [id, level] of Object.entries(value)) {
    const box = asNonNegativeInt(level);
    if (box === null) continue;
    const interval = LEITNER_INTERVALS[Math.min(box, LEITNER_INTERVALS.length - 1)] ?? 0;
    out.set(asWordId(id), {
      ease: DEFAULT_EASE,
      interval: asDays(interval),
      // Termin zero znaczy "do powtórki od razu" — tak samo działała stara wersja.
      due: asDayNumber(0),
      reps: box,
      lapses: 0,
    });
  }
  return out;
}

export function decodeCounts(value: unknown): DailyCounts {
  const out = new Map<DateKey, number>();
  if (!isRecord(value)) return out;
  for (const [key, count] of Object.entries(value)) {
    const n = asNonNegativeInt(count);
    if (n !== null) out.set(asDateKey(key), n);
  }
  return out;
}

export const encodeCounts = (counts: DailyCounts): Record<string, number> =>
  Object.fromEntries(counts);
