import { addDays, dayNumberOf } from "./day";
import {
  asDays,
  assertNever,
  type DayNumber,
  type Days,
  type ExerciseKind,
  type Grade,
  type Review,
  type WordState,
} from "./types";

/** Odstęp, powyżej którego słowo uznajemy za utrwalone. */
export const MATURE_DAYS = 21;
/** Odstęp młodego słowa zaczyna się tutaj. */
export const YOUNG_DAYS = 7;
/** Tyle wpadek robi ze słowa "trudne". */
export const LEECH_LAPSES = 3;
/** Sufit odstępu: wagi mnożą się przy każdej powtórce i bez tego uciekają. */
export const MAX_INTERVAL = asDays(365);

const EASE_START = 2.5;
const EASE_MIN = 1.3;
const EASE_MAX = 3.2;

/**
 * Waga dowodu: trafienie w teście wyboru znaczy mniej niż przypomnienie z głowy,
 * bo jedno na cztery można trafić przypadkiem. Wpisanie znaczy najwięcej.
 */
export const EVIDENCE: Readonly<Record<ExerciseKind, number>> = {
  type: 1.2,
  card: 1,
  choice: 0.95,
  cloze: 0.95,
  listen: 0.9,
};

/** Quiz włoski → polski jest łatwiejszy niż polski → włoski i waży mniej. */
export const RECOGNITION_EVIDENCE = 0.85;

export const evidenceOf = (exercise: {
  kind: ExerciseKind;
  direction?: "it-pl" | "pl-it";
}): number =>
  exercise.kind === "choice" && exercise.direction === "it-pl"
    ? RECOGNITION_EVIDENCE
    : EVIDENCE[exercise.kind];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number): Days => asDays(Math.round(value));

/** Pierwszy odstęp po każdej ocenie dla słowa, które dopiero poznajesz. */
const FIRST_INTERVAL: Readonly<Record<Grade, number>> = {
  again: 0,
  hard: 1,
  // Dwa dni, żeby "Dobrze" realnie różniło się od "Słabo" — inaczej oba dawały jutro.
  good: 2,
  easy: 4,
};

/**
 * Nowy stan powtórek po ocenie. Funkcja czysta: nie dotyka zegara ani zapisu,
 * `today` przychodzi z zewnątrz, dzięki czemu testy nie zależą od daty.
 */
export function schedule(
  review: Review | null,
  grade: Grade,
  today: DayNumber,
  weight = 1,
): Review {
  const previous: Review = review ?? {
    ease: EASE_START,
    interval: asDays(0),
    due: today,
    reps: 0,
    lapses: 0,
  };
  const fresh = previous.reps === 0;

  let ease = previous.ease;
  let lapses = previous.lapses;
  let interval: Days;

  switch (grade) {
    case "again":
      ease = clamp(ease - 0.2, EASE_MIN, EASE_MAX);
      lapses += 1;
      interval = asDays(0);
      break;
    case "hard":
      ease = clamp(ease - 0.15, EASE_MIN, EASE_MAX);
      interval = fresh
        ? asDays(FIRST_INTERVAL.hard)
        : asDays(Math.max(1, Math.round(previous.interval * 1.2 * weight)));
      break;
    case "good":
      interval = fresh
        ? asDays(FIRST_INTERVAL.good)
        : previous.interval <= 1
          ? asDays(Math.max(2, Math.round(3 * weight)))
          : round(previous.interval * ease * weight);
      break;
    case "easy":
      ease = clamp(ease + 0.15, EASE_MIN, EASE_MAX);
      interval = fresh
        ? asDays(FIRST_INTERVAL.easy)
        : asDays(Math.max(4, Math.round(previous.interval * ease * 1.3 * weight)));
      break;
    default:
      return assertNever(grade);
  }

  const capped = asDays(Math.min(interval, MAX_INTERVAL));
  return {
    ease,
    interval: capped,
    due: addDays(today, capped),
    reps: previous.reps + 1,
    lapses,
  };
}

export const isDue = (review: Review, today: DayNumber): boolean => review.due <= today;

export const isLeech = (review: Review | undefined): boolean =>
  review !== undefined && review.lapses >= LEECH_LAPSES;

export function stateOf(review: Review | undefined): WordState {
  if (review === undefined) return "untouched";
  if (review.interval >= MATURE_DAYS) return "mature";
  if (review.interval >= YOUNG_DAYS) return "young";
  return "learning";
}

/** Podgląd odstępu dla przycisku oceny — bez wagi, bo ta zależy od formy ćwiczenia. */
export const previewInterval = (review: Review | null, grade: Grade, now: Date): Days =>
  schedule(review, grade, dayNumberOf(now)).interval;
