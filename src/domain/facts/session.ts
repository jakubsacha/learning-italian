/**
 * Nauka faktów: dobór formy, test ABCD, kolejka i sesja. Wszystko czyste —
 * zegar, losowość i zapis przychodzą z zewnątrz.
 */

import type { Choice, DayNumber, Review } from "../types.js";
import { asDays } from "../types.js";
import { isDue, isLeech, schedule } from "../scheduler.js";
import { pick, shuffle, type Rng } from "../random.js";
import { RETRY_AFTER } from "../session.js";
import type {
  Fact,
  FactAnswer,
  FactExercise,
  FactQueueInput,
  FactSession,
} from "./types.js";

/** Ile nowych faktów daje przycisk „jeszcze kilka". */
export const EXTRA_FACTS = 10;

/** Trafienie w teście wyboru to słabszy dowód niż przypomnienie sobie z głowy. */
export const CHOICE_WEIGHT = 0.9;

/**
 * Kolejność wprowadzania: najpierw wszystko, co w książce pogrubione, a dopiero
 * potem reszta — w obu grupach po kolei, jak w podręczniku. Przed sprawdzianem
 * najważniejsze mają być przerobione, zanim przyjdzie czas na ciekawostki.
 */
export const learningOrder = (facts: readonly Fact[]): readonly Fact[] =>
  facts.slice().sort((a, b) => Number(b.key) - Number(a.key) || a.order - b.order);

/**
 * Trzy błędne odpowiedzi tego samego rodzaju: najpierw z tego samego tematu,
 * potem z pozostałych. Ten sam tekst co poprawna odpada — „17 września 1939 r."
 * to odpowiedź na dwa różne pytania i nie może być jednocześnie błędna.
 */
export function choicesFor(fact: Fact, all: readonly Fact[], rng: Rng): readonly Choice[] {
  const sameKind = all.filter((f) => f.kind === fact.kind && f.a !== fact.a);
  const near = shuffle(sameKind.filter((f) => f.lesson === fact.lesson), rng);
  const far = shuffle(sameKind.filter((f) => f.lesson !== fact.lesson), rng);
  const wrong: string[] = [];
  for (const f of [...near, ...far]) {
    if (wrong.length === 3) break;
    if (!wrong.includes(f.a)) wrong.push(f.a);
  }
  return shuffle(
    [{ text: fact.a, correct: true }, ...wrong.map((text) => ({ text, correct: false }))],
    rng,
  );
}

/** Nowy fakt najpierw do przeczytania; potem na przemian z głowy i z wyboru. */
export function chooseFactForm(review: Review | undefined, rng: Rng): FactExercise["kind"] {
  if (review === undefined || review.reps < 1) return "card";
  // Fakt, na którym się wykładasz, częściej wraca jako karta — do przeczytania.
  if (isLeech(review)) return pick(["card", "card", "choice"], rng);
  return pick(["card", "choice", "choice"], rng);
}

export function buildFactExercise(
  fact: Fact,
  review: Review | undefined,
  all: readonly Fact[],
  rng: Rng,
): FactExercise {
  const kind = chooseFactForm(review, rng);
  if (kind === "card") return { kind, fact };
  const choices = choicesFor(fact, all, rng);
  // Za mało podobnych odpowiedzi na sensowny test — zostaje karta.
  return choices.length < 4 ? { kind: "card", fact } : { kind, fact, choices };
}

export const freshFacts = (input: FactQueueInput): readonly Fact[] =>
  learningOrder(input.facts).filter((f) => !input.progress.has(f.id));

export const dueFacts = (input: FactQueueInput): readonly Fact[] =>
  input.facts.filter((f) => {
    const review = input.progress.get(f.id);
    return review !== undefined && isDue(review, input.today);
  });

export const factsLeft = (input: FactQueueInput): number =>
  Math.max(0, input.newLimit - input.newDone);

/** Powtórki w losowej kolejności, po nich nowe — w kolejności nauki. */
export function buildFactQueue(input: FactQueueInput, rng: Rng): readonly Fact[] {
  const fresh = freshFacts(input).slice(0, input.extra ? EXTRA_FACTS : factsLeft(input));
  return [...shuffle(dueFacts(input), rng), ...fresh];
}

const finish = (input: FactQueueInput, started: boolean): FactSession => {
  const dues = input.facts
    .map((f) => input.progress.get(f.id)?.due)
    .filter((d): d is DayNumber => d !== undefined)
    .sort((a, b) => a - b);
  const soonest = dues[0];
  return {
    status: "done",
    reason: started ? "finished" : "empty",
    nextDue: soonest === undefined ? null : asDays(soonest - input.today),
    newInReserve: freshFacts(input).length,
  };
};

const activate = (
  queue: readonly Fact[],
  passed: number,
  started: boolean,
  input: FactQueueInput,
  all: readonly Fact[],
  rng: Rng,
): FactSession => {
  const [head, ...rest] = queue;
  if (head === undefined) return finish(input, started);
  return {
    status: "active",
    current: buildFactExercise(head, input.progress.get(head.id), all, rng),
    phase: { phase: "question" },
    queue: rest,
    passed,
  };
};

/** `all` to cały materiał — błędne odpowiedzi biorą się też spoza wybranego zakresu. */
export const startFacts = (input: FactQueueInput, all: readonly Fact[], rng: Rng): FactSession =>
  activate(buildFactQueue(input, rng), 0, false, input, all, rng);

export const advanceFacts = (
  session: FactSession,
  input: FactQueueInput,
  all: readonly Fact[],
  rng: Rng,
): FactSession =>
  session.status === "done"
    ? session
    : activate(session.queue, session.passed, true, input, all, rng);

export type FactResult = {
  readonly session: FactSession;
  readonly fact: Fact;
  readonly review: Review;
  readonly correct: boolean;
  readonly wasNew: boolean;
};

export function answerFact(
  session: FactSession,
  given: FactAnswer,
  input: FactQueueInput,
): FactResult | null {
  if (session.status === "done" || session.phase.phase === "answered") return null;
  const exercise = session.current;
  // Odpowiedź musi pasować do formy — inaczej nie zapisujemy nic.
  if ((exercise.kind === "card") !== (given.via === "self")) return null;
  const grade = given.via === "self" ? given.grade : given.correct ? "good" : "again";
  const weight = given.via === "self" ? 1 : CHOICE_WEIGHT;
  const correct = grade !== "again";
  const fact = exercise.fact;
  const previous = input.progress.get(fact.id) ?? null;
  const review = schedule(previous, grade, input.today, weight);
  const at = Math.min(session.queue.length, RETRY_AFTER);
  const queue = correct
    ? session.queue
    : [...session.queue.slice(0, at), fact, ...session.queue.slice(at)];
  return {
    session: {
      ...session,
      phase: { phase: "answered", correct },
      queue,
      passed: correct ? session.passed + 1 : session.passed,
    },
    fact,
    review,
    correct,
    wasNew: previous === null,
  };
}

export function factSummary(session: FactSession): {
  readonly left: number;
  readonly passed: number;
  readonly total: number;
  readonly percent: number;
} {
  if (session.status === "done") return { left: 0, passed: 0, total: 0, percent: 100 };
  const left = session.queue.length + (session.phase.phase === "answered" ? 0 : 1);
  const total = session.passed + left;
  return { left, passed: session.passed, total, percent: total === 0 ? 100 : (session.passed / total) * 100 };
}

/* ---------- oś czasu ---------- */

export type DatedFact = Fact & { readonly event: NonNullable<Fact["event"]> };

export const isDated = (f: Fact): f is DatedFact => f.event !== null;

/** Ile wydarzeń w jednej rundzie osi czasu. */
export const TIMELINE_SIZE = 4;

/**
 * Czy kolejność dwóch wydarzeń da się ustalić z samej książki. Nie da się, gdy
 * są tego samego dnia, albo gdy wypadają w tym samym miesiącu, a choć jedno ma
 * w książce tylko miesiąc: „w czerwcu 1940 r." przed czy po „22 czerwca 1940 r."?
 * Takie dwa nigdy nie trafiają do jednej rundy.
 */
export function comparable(a: DatedFact, b: DatedFact): boolean {
  if (a.event.when === b.event.when) return false;
  const month = (w: number): number => Math.floor(w / 100);
  const monthOnly = (w: number): boolean => w % 100 === 0;
  return month(a.event.when) !== month(b.event.when) || (!monthOnly(a.event.when) && !monthOnly(b.event.when));
}

/** Losowe wydarzenia, z których każde dwa da się jednoznacznie uporządkować. */
export function timelineRound(facts: readonly Fact[], rng: Rng, size = TIMELINE_SIZE): readonly DatedFact[] {
  const picked: DatedFact[] = [];
  for (const f of shuffle(facts.filter(isDated), rng)) {
    if (picked.length === size) break;
    if (picked.every((p) => comparable(p, f))) picked.push(f);
  }
  return picked;
}

export const chronological = (events: readonly DatedFact[]): readonly DatedFact[] =>
  events.slice().sort((a, b) => a.event.when - b.event.when);

/** Ułożone dobrze, gdy kolejność zgadza się co do jednego wydarzenia. */
export const timelineRight = (placed: readonly DatedFact[]): boolean =>
  placed.every((f, i) => i === 0 || (placed[i - 1]?.event.when ?? 0) < f.event.when);
