/**
 * Maszyna stanu sesji. Wszystko tutaj jest czyste: stan wchodzi, stan wychodzi.
 * Zapis do pamięci, mowa i rysowanie ekranu dzieją się gdzie indziej.
 */

import type {
  DayNumber,
  Exercise,
  Grade,
  Review,
  Sentence,
  Session,
  SessionKind,
  Word,
} from "./types.js";
import { assertNever } from "./types.js";
import { asDays } from "./types.js";
import { EVIDENCE, evidenceOf, schedule } from "./scheduler.js";
import type { TypedOutcome } from "./text.js";
import { buildQueue, leechWords, newWords, type QueueInput } from "./queue.js";
import type { Rng } from "./random.js";
import { buildExercise, chooseForm } from "./exercise.js";

/** Po tylu kartach wraca słowo ocenione na "Nie wiem". */
export const RETRY_AFTER = 4;

export type Deps = {
  readonly sentencesFor: (word: Word) => readonly Sentence[];
  /** Bez działającego syntezatora nie ma ćwiczeń ze słuchu. */
  readonly canListen: boolean;
  readonly rng: Rng;
};

/** Sposób udzielenia odpowiedzi. Każda forma ma swój, i tylko swój. */
export type Answer =
  /** Fiszka: oceniasz się sam, czterostopniowo. */
  | { readonly via: "self"; readonly grade: Grade }
  | { readonly via: "choice"; readonly correct: boolean }
  | { readonly via: "typed"; readonly outcome: TypedOutcome };

export type Graded = {
  readonly grade: Grade;
  /** Waga dowodu, którą mnoży się odstęp — patrz `EVIDENCE`. */
  readonly weight: number;
  readonly correct: boolean;
};

/** Ocena i waga wynikające z formy ćwiczenia i sposobu odpowiedzi. */
export function gradeAnswer(exercise: Exercise, answer: Answer): Graded {
  switch (answer.via) {
    case "self":
      return { grade: answer.grade, weight: EVIDENCE.card, correct: answer.grade !== "again" };
    case "choice":
      return {
        grade: answer.correct ? "good" : "again",
        weight: evidenceOf(exercise),
        correct: answer.correct,
      };
    case "typed":
      // Literówka liczy się jak zwykłe "Dobrze": nie kasuje postępu, ale go nie przyspiesza.
      return answer.outcome === "exact"
        ? { grade: "good", weight: EVIDENCE.type, correct: true }
        : answer.outcome === "typo"
          ? { grade: "good", weight: 1, correct: true }
          : { grade: "again", weight: 1, correct: false };
    default:
      return assertNever(answer);
  }
}

const finish = (kind: SessionKind, input: QueueInput): Session => {
  const dues = input.pool
    .map((w) => input.progress.get(w.id)?.due)
    .filter((d): d is DayNumber => d !== undefined)
    .sort((a, b) => a - b);
  const soonest = dues[0];
  const anyLeech = leechWords(input).length > 0;
  return {
    status: "done",
    kind,
    reason:
      kind === "hard" ? (anyLeech ? "hard-finished" : "no-leeches") : "daily-finished",
    nextDue: soonest === undefined ? null : asDays(soonest - input.today),
    newInReserve: newWords(input).length,
  };
};

const exerciseFor = (word: Word, kind: SessionKind, input: QueueInput, deps: Deps): Exercise => {
  const sentences = deps.sentencesFor(word);
  const form = chooseForm(
    {
      word,
      progress: input.progress,
      cardsOnly: kind === "cards",
      canListen: deps.canListen,
      sentences,
    },
    deps.rng,
  );
  return buildExercise(
    form,
    { word, progress: input.progress, pool: input.pool, sentences },
    deps.rng,
  );
};

const activate = (
  kind: SessionKind,
  queue: readonly Word[],
  passed: number,
  input: QueueInput,
  deps: Deps,
): Session => {
  const [head, ...rest] = queue;
  if (head === undefined) return finish(kind, input);
  return {
    status: "active",
    kind,
    current: exerciseFor(head, kind, input, deps),
    phase: { phase: "question" },
    queue: rest,
    passed,
  };
};

/** Nowa sesja: buduje kolejkę i wystawia pierwsze ćwiczenie. */
export function startSession(kind: SessionKind, input: QueueInput, deps: Deps): Session {
  return activate(kind, buildQueue(kind, input, deps.rng), 0, input, deps);
}

/**
 * Przejście do następnego ćwiczenia. Gdy kolejka pusta, próbujemy zbudować ją
 * jeszcze raz — poza treningiem trudnych, bo tam wpadki nie znikają po odpowiedzi
 * i lista odbudowywałaby się bez końca.
 */
export function advance(session: Session, input: QueueInput, deps: Deps): Session {
  if (session.status === "done") return session;
  if (session.queue.length > 0) {
    return activate(session.kind, session.queue, session.passed, input, deps);
  }
  const refilled = session.kind === "hard" ? [] : buildQueue(session.kind, input, deps.rng);
  return activate(session.kind, refilled, session.passed, input, deps);
}

export type AnswerResult = {
  readonly session: Session;
  readonly graded: Graded;
  readonly word: Word;
  /** Nowy stan powtórek słowa — do zapisania przez warstwę wyżej. */
  readonly review: Review;
  /** Czy słowo było wprowadzane po raz pierwszy: tylko takie liczą się do limitu dnia. */
  readonly wasNew: boolean;
};

/**
 * Odpowiedź na bieżące ćwiczenie. Sesja przechodzi w fazę "answered" — nie do
 * następnego słowa. Dopiero `advance` idzie dalej, bo najpierw pokazujemy wynik.
 */
export function answer(session: Session, given: Answer, input: QueueInput): AnswerResult | null {
  if (session.status === "done" || session.phase.phase === "answered") return null;
  const word = session.current.word;
  const graded = gradeAnswer(session.current, given);
  const previous = input.progress.get(word.id) ?? null;
  const review = schedule(previous, graded.grade, input.today, graded.weight);
  // "Nie wiem" nie zalicza karty — słowo wraca do kolejki, licznik stoi w miejscu.
  const queue = graded.correct
    ? session.queue
    : [
        ...session.queue.slice(0, Math.min(session.queue.length, RETRY_AFTER)),
        word,
        ...session.queue.slice(Math.min(session.queue.length, RETRY_AFTER)),
      ];
  return {
    session: {
      ...session,
      phase: { phase: "answered", correct: graded.correct },
      queue,
      passed: graded.correct ? session.passed + 1 : session.passed,
    },
    graded,
    word,
    review,
    wasNew: previous === null,
  };
}

/** Ile kart zostało w tej sesji razem z bieżącą. */
export const remaining = (session: Session): number =>
  session.status === "done" ? 0 : session.queue.length + 1;
