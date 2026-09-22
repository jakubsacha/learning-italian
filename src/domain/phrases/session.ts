/**
 * Kolejka i maszyna stanu rozmówek. Ta sama zasada co przy słowach: czyste
 * funkcje, stan wchodzi i wychodzi, zapis dzieje się warstwę wyżej.
 */

import type { DayNumber, Review } from "../types.js";
import { asDays } from "../types.js";
import { isDue, schedule } from "../scheduler.js";
import { shuffle, type Rng } from "../random.js";
import { RETRY_AFTER } from "../session.js";
import { buildPhraseExercise, choosePhraseForm, gradePhrase } from "./forms.js";
import type {
  Phrase,
  PhraseAnswer,
  PhraseGraded,
  PhraseQueueInput,
  PhraseSession,
  Scene,
} from "./types.js";

/** Ile nowych kwestii daje przycisk „jeszcze kilka nowych". */
export const EXTRA_PHRASES = 5;

export const allPhrases = (scenes: readonly Scene[]): readonly Phrase[] =>
  scenes.flatMap((s) => s.phrases);

/**
 * Nowe kwestie w kolejności dialogu: najpierw z wybranej sytuacji, a gdy ta
 * się skończy — z następnych. Bez wybranej zaczynamy od pierwszej niedokończonej.
 */
export function freshPhrases(input: PhraseQueueInput): readonly Phrase[] {
  const start = Math.max(
    0,
    input.scene === null ? 0 : input.scenes.findIndex((s) => s.id === input.scene),
  );
  const ordered = [...input.scenes.slice(start), ...input.scenes.slice(0, start)];
  return ordered.flatMap((s) => s.phrases.filter((p) => !input.progress.has(p.id)));
}

export const duePhrases = (input: PhraseQueueInput): readonly Phrase[] =>
  allPhrases(input.scenes).filter((p) => {
    const review = input.progress.get(p.id);
    return review !== undefined && isDue(review, input.today);
  });

export const phrasesLeft = (input: PhraseQueueInput): number =>
  Math.max(0, input.newLimit - input.newDone);

/**
 * Powtórki w losowej kolejności, a po nich nowe — w kolejności dialogu, bo
 * rozmowę łatwiej zapamiętać po kolei niż w rozsypce.
 */
export function buildPhraseQueue(input: PhraseQueueInput, rng: Rng): readonly Phrase[] {
  const fresh = freshPhrases(input).slice(0, input.extra ? EXTRA_PHRASES : phrasesLeft(input));
  return [...shuffle(duePhrases(input), rng), ...fresh];
}

export type PhraseDeps = {
  readonly canListen: boolean;
  readonly rng: Rng;
};

const finish = (input: PhraseQueueInput, started: boolean): PhraseSession => {
  const dues = allPhrases(input.scenes)
    .map((p) => input.progress.get(p.id)?.due)
    .filter((d): d is DayNumber => d !== undefined)
    .sort((a, b) => a - b);
  const soonest = dues[0];
  return {
    status: "done",
    reason: started ? "finished" : "empty",
    nextDue: soonest === undefined ? null : asDays(soonest - input.today),
    newInReserve: freshPhrases(input).length,
  };
};

const activate = (
  queue: readonly Phrase[],
  passed: number,
  started: boolean,
  input: PhraseQueueInput,
  deps: PhraseDeps,
): PhraseSession => {
  const [head, ...rest] = queue;
  if (head === undefined) return finish(input, started);
  const kind = choosePhraseForm(
    { phrase: head, review: input.progress.get(head.id), canListen: deps.canListen },
    deps.rng,
  );
  return {
    status: "active",
    current: buildPhraseExercise(kind, head, input.scenes, deps.rng),
    phase: { phase: "question" },
    queue: rest,
    passed,
  };
};

export const startPhrases = (input: PhraseQueueInput, deps: PhraseDeps): PhraseSession =>
  activate(buildPhraseQueue(input, deps.rng), 0, false, input, deps);

/** Kolejna kwestia. Pusta kolejka kończy sesję — nie dosypujemy w kółko. */
export const advancePhrases = (
  session: PhraseSession,
  input: PhraseQueueInput,
  deps: PhraseDeps,
): PhraseSession =>
  session.status === "done"
    ? session
    : activate(session.queue, session.passed, true, input, deps);

export type PhraseResult = {
  readonly session: PhraseSession;
  readonly graded: PhraseGraded;
  readonly phrase: Phrase;
  readonly review: Review;
  readonly wasNew: boolean;
};

export function answerPhrase(
  session: PhraseSession,
  given: PhraseAnswer,
  input: PhraseQueueInput,
): PhraseResult | null {
  if (session.status === "done" || session.phase.phase === "answered") return null;
  const graded = gradePhrase(session.current, given);
  if (graded === null) return null;
  const phrase = session.current.phrase;
  const previous = input.progress.get(phrase.id) ?? null;
  const review = schedule(previous, graded.grade, input.today, graded.weight);
  const at = Math.min(session.queue.length, RETRY_AFTER);
  // „Nie wiem" nie zalicza kwestii — wraca kilka kart dalej.
  const queue = graded.correct
    ? session.queue
    : [...session.queue.slice(0, at), phrase, ...session.queue.slice(at)];
  return {
    session: {
      ...session,
      phase: { phase: "answered", correct: graded.correct },
      queue,
      passed: graded.correct ? session.passed + 1 : session.passed,
    },
    graded,
    phrase,
    review,
    wasNew: previous === null,
  };
}

/** Pasek sesji: zaliczone i pozostałe, bez liczenia dwa razy karty z werdyktem. */
export function phraseSummary(session: PhraseSession): {
  readonly left: number;
  readonly passed: number;
  readonly total: number;
  readonly percent: number;
} {
  if (session.status === "done") return { left: 0, passed: 0, total: 0, percent: 100 };
  const left = session.queue.length + (session.phase.phase === "answered" ? 0 : 1);
  const total = session.passed + left;
  return {
    left,
    passed: session.passed,
    total,
    percent: total === 0 ? 100 : (session.passed / total) * 100,
  };
}
