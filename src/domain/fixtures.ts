/** Materiał testowy i deterministyczna losowość — używane tylko w testach. */

import type { DayNumber, Progress, Review, Sentence, Word, WordId } from "./types.js";
import { asDayNumber, asDays, asWordId } from "./types.js";
import type { Rng } from "./random.js";
import type { QueueInput } from "./queue.js";

export const TODAY: DayNumber = asDayNumber(20_700);

export const word = (it: string, order: number, pl = "po polsku " + it): Word => ({
  id: asWordId(it),
  it,
  pr: it,
  pl,
  category: "test",
  level: 1,
  order,
});

export const words = (count: number): readonly Word[] =>
  Array.from({ length: count }, (_, i) => word("slowo" + String(i), i));

export const review = (over: Partial<Review> = {}): Review => ({
  ease: 2.5,
  interval: asDays(1),
  due: TODAY,
  reps: 1,
  lapses: 0,
  ...over,
});

export const progressOf = (entries: readonly (readonly [Word, Review])[]): Progress =>
  new Map<WordId, Review>(entries.map(([w, r]) => [w.id, r]));

export const sentence = (it: string, gap: string): Sentence => ({
  it,
  pl: "zdanie po polsku",
  gap,
  level: 1,
});

/** Zawsze pierwszy element i kolejność bez zmian — testy mają być powtarzalne. */
export const firstRng: Rng = () => 0;

/** Odtwarza podany ciąg liczb, potem wraca do zera. */
export const rngOf = (values: readonly number[]): Rng => {
  let i = 0;
  return () => values[i++] ?? 0;
};

export const input = (over: Partial<QueueInput> = {}): QueueInput => ({
  pool: words(20),
  progress: new Map(),
  today: TODAY,
  newLimit: 10,
  newDone: 0,
  extra: false,
  seen: new Set(),
  ...over,
});
