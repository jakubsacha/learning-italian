/**
 * Fakty do nauki historii: pytanie i odpowiedź, jak w podręczniku. Każdy fakt
 * ma rodzaj odpowiedzi — dzięki temu w teście ABCD data walczy z datami, a osoba
 * z osobami. Pytanie „Kiedy wybuchła wojna?" z odpowiedzią „Westerplatte" do
 * wyboru niczego by nie sprawdzało.
 */

import type { Choice, DayNumber, Days, Grade, Phase, Review } from "../types.js";

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type FactId = Brand<string, "FactId">;
export const asFactId = (s: string): FactId => s as FactId;

/** Temat z podręcznika; 3 to wkładka „Dlaczego Niemcy nie zdobyli Anglii?". */
export type Lesson = 1 | 2 | 3;

export type AnswerKind =
  | "data"
  | "osoba"
  | "miejsce"
  | "bitwa"
  | "panstwa"
  | "nazwa"
  | "pojecie"
  | "liczba"
  | "wyjasnienie";

/** Data wydarzenia do ułożenia na osi czasu. Fakt bez niej na oś nie trafia. */
export type TimelineEvent = {
  /** RRRRMMDD — tylko do porównań, na ekran idzie odpowiedź z książki. */
  readonly when: number;
  readonly label: string;
};

export type Fact = {
  readonly id: FactId;
  readonly q: string;
  readonly a: string;
  readonly kind: AnswerKind;
  /** Pogrubione albo czerwone w książce — najważniejsze, wchodzą pierwsze. */
  readonly key: boolean;
  readonly lesson: Lesson;
  readonly section: string;
  readonly page: number | null;
  readonly event: TimelineEvent | null;
  /** Kolejność w książce. */
  readonly order: number;
};

export type FactProgress = ReadonlyMap<FactId, Review>;

export type FactExercise =
  /** Pytanie, odsłaniasz odpowiedź, oceniasz się sam. */
  | { readonly kind: "card"; readonly fact: Fact }
  /** Pytanie i cztery odpowiedzi tego samego rodzaju. */
  | { readonly kind: "choice"; readonly fact: Fact; readonly choices: readonly Choice[] };

export type FactAnswer =
  | { readonly via: "self"; readonly grade: Grade }
  | { readonly via: "choice"; readonly correct: boolean };

export type FactSession =
  | {
      readonly status: "active";
      readonly current: FactExercise;
      readonly phase: Phase;
      readonly queue: readonly Fact[];
      readonly passed: number;
    }
  | {
      readonly status: "done";
      readonly reason: "finished" | "empty";
      readonly nextDue: Days | null;
      readonly newInReserve: number;
    };

export type FactQueueInput = {
  /** Fakty z wybranego zakresu, w kolejności wprowadzania. */
  readonly facts: readonly Fact[];
  readonly progress: FactProgress;
  readonly today: DayNumber;
  readonly newLimit: number;
  readonly newDone: number;
  readonly extra: boolean;
};
