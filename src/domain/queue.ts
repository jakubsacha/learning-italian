/**
 * Budowa dziennej kolejki. Funkcja czysta: dostaje pulę, postęp i dzień,
 * oddaje listę słów. Nie czyta zegara ani pamięci przeglądarki.
 */

import type { DayNumber, Progress, SessionKind, Word, WordId } from "./types.js";
import { isDue, isLeech } from "./scheduler.js";
import { shuffle, type Rng } from "./random.js";

/** Ile słów, na których się wykładasz, dociągamy do zwykłej sesji. */
export const HARD_IN_SESSION = 5;
/** Ile trudnych słów ma trening "Trenuj trudne". */
export const HARD_SESSION_SIZE = 20;
/** Ile nowych słów dokłada przycisk "Ucz się dalej". */
export const EXTRA_BATCH = 10;

export type QueueInput = {
  readonly pool: readonly Word[];
  readonly progress: Progress;
  readonly today: DayNumber;
  /** Dzienny limit nowych słów z ustawień. */
  readonly newLimit: number;
  /** Ile nowych słów już dziś wprowadzono. */
  readonly newDone: number;
  /** Sesja poza planem dziennym: nowe słowa ponad limit, nic nie dolicza do dnia. */
  readonly extra: boolean;
  /** Co już dziś było na ekranie — inaczej trudne wracałyby po każdym odświeżeniu. */
  readonly seen: ReadonlySet<WordId>;
};

const lapsesOf = (progress: Progress, word: Word): number =>
  progress.get(word.id)?.lapses ?? 0;

const byLapsesDesc = (progress: Progress) => (a: Word, b: Word) =>
  lapsesOf(progress, b) - lapsesOf(progress, a);

/** Najpierw to, co najczęstsze w mówionym włoskim — patrz pole `order`. */
const byFrequency = (a: Word, b: Word): number => a.order - b.order;

export const isNew = (progress: Progress, word: Word): boolean => !progress.has(word.id);

export const newWords = (input: QueueInput): readonly Word[] =>
  input.pool.filter((w) => isNew(input.progress, w)).slice().sort(byFrequency);

export const dueWords = (input: QueueInput): readonly Word[] =>
  input.pool.filter((w) => {
    const review = input.progress.get(w.id);
    return review !== undefined && isDue(review, input.today);
  });

export const leechWords = (input: QueueInput): readonly Word[] =>
  input.pool.filter((w) => isLeech(input.progress.get(w.id))).slice().sort(byLapsesDesc(input.progress));

/** Ile nowych słów zostało do dzisiejszego limitu. */
export const newLeft = (input: QueueInput): number =>
  Math.max(0, input.newLimit - input.newDone);

export function buildQueue(kind: SessionKind, input: QueueInput, rng: Rng): readonly Word[] {
  if (kind === "hard") return leechWords(input).slice(0, HARD_SESSION_SIZE);

  const due = dueWords(input);
  const dueIds = new Set(due.map((w) => w.id));
  // Słowa, na których się wykładasz, dorzucamy do sesji także przed terminem.
  const hard = leechWords(input)
    .filter((w) => !dueIds.has(w.id) && !input.seen.has(w.id))
    .slice(0, HARD_IN_SESSION);
  const fresh = newWords(input).slice(0, input.extra ? EXTRA_BATCH : newLeft(input));

  const queue = shuffle([...due, ...hard, ...fresh], rng);
  if (queue.length > 0 || !input.extra) return queue;

  // Poza planem, a nie ma czego powtarzać: bierzemy to, co ma najbliższy termin.
  return input.pool
    .filter((w) => input.progress.has(w.id))
    .slice()
    .sort((a, b) => (input.progress.get(a.id)?.due ?? 0) - (input.progress.get(b.id)?.due ?? 0))
    .slice(0, EXTRA_BATCH);
}
