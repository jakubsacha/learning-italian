/**
 * Rozmówki: zdania w sytuacjach. Każda kwestia to osobny element powtórek z
 * własnym terminem — tak jak słowo, tylko z innymi formami ćwiczeń.
 *
 * Kwestia ma mówcę. Swoje kwestie („ty") ćwiczysz aż do mówienia z głowy;
 * kwestie rozmówcy („oni") — do rozumienia ze słuchu. Nikt nie musi umieć
 * wypowiedzieć „Il cornetto vuoto o alla crema?", ale trzeba to zrozumieć.
 */

import type { Choice, DayNumber, Days, Grade, Phase, Review } from "../types.js";
import type { TypedOutcome } from "../text.js";

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type PhraseId = Brand<string, "PhraseId">;
export type SceneId = Brand<string, "SceneId">;

export const asPhraseId = (s: string): PhraseId => s as PhraseId;
export const asSceneId = (s: string): SceneId => s as SceneId;

export type Speaker = "ty" | "oni";

export type Phrase = {
  readonly id: PhraseId;
  readonly it: string;
  readonly pl: string;
  readonly who: Speaker;
  readonly scene: SceneId;
  /** Miejsce w dialogu — nowe kwestie wchodzą w tej kolejności. */
  readonly order: number;
};

export type Scene = {
  readonly id: SceneId;
  readonly icon: string;
  readonly title: string;
  readonly phrases: readonly Phrase[];
};

export type PhraseProgress = ReadonlyMap<PhraseId, Review>;

/** Klocek rozsypanki. `slot` to miejsce w zdaniu, bo te same słowa mogą się powtarzać. */
export type Tile = { readonly text: string; readonly slot: number };

/** Forma ćwiczenia razem z dokładnie tymi danymi, których potrzebuje. */
export type PhraseExercise =
  /** Pierwsze zetknięcie: widzisz i słyszysz włoski, odsłaniasz znaczenie, oceniasz się. */
  | { readonly kind: "read"; readonly phrase: Phrase }
  /** Słyszysz zdanie, wybierasz, co znaczy. */
  | { readonly kind: "listen"; readonly phrase: Phrase; readonly choices: readonly Choice[] }
  /** Widzisz polskie, układasz włoskie z rozsypanych słów. */
  | { readonly kind: "order"; readonly phrase: Phrase; readonly tiles: readonly Tile[] }
  /** Widzisz polskie, mówisz na głos, odsłaniasz i oceniasz się sam. */
  | { readonly kind: "speak"; readonly phrase: Phrase }
  /** Słyszysz zdanie i je zapisujesz. */
  | { readonly kind: "dictation"; readonly phrase: Phrase };

export type PhraseExerciseKind = PhraseExercise["kind"];

/** Sposób odpowiedzi. Rozsypankę i dyktando ocenia program, resztę — Ty. */
export type PhraseAnswer =
  | { readonly via: "self"; readonly grade: Grade }
  | { readonly via: "choice"; readonly correct: boolean }
  | { readonly via: "order"; readonly placed: readonly string[] }
  | { readonly via: "typed"; readonly text: string };

export type PhraseGraded = {
  readonly grade: Grade;
  readonly weight: number;
  readonly correct: boolean;
  /** Tylko dyktando: czy bez błędu, z literówką, czy źle. */
  readonly typed: TypedOutcome | null;
};

export type PhraseSession =
  | {
      readonly status: "active";
      readonly current: PhraseExercise;
      readonly phase: Phase;
      readonly queue: readonly Phrase[];
      readonly passed: number;
    }
  | {
      readonly status: "done";
      /** `empty`: nie było czego podać — nic do powtórki i nowe się skończyły. */
      readonly reason: "finished" | "empty";
      readonly nextDue: Days | null;
      readonly newInReserve: number;
    };

export type PhraseQueueInput = {
  readonly scenes: readonly Scene[];
  readonly progress: PhraseProgress;
  readonly today: DayNumber;
  readonly newLimit: number;
  readonly newDone: number;
  /** Sytuacja, z której biorą się nowe kwestie; `null` — pierwsza nieskończona. */
  readonly scene: SceneId | null;
  /** Dodatkowa paczka nowych na żądanie, poza dziennym limitem. */
  readonly extra: boolean;
};
