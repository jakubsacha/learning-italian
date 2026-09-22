/**
 * Model domeny. Zasada nadrzędna: stanów niepoprawnych nie da się wyrazić.
 * Zamiast zbioru luźnych flag (`flipped`, `settled`, `mode`, `cardMode`),
 * które mogą sobie przeczyć, mamy unie rozróżniane po polu `kind`/`status`.
 */

/* ---------- skalary z marką ---------- */
/* Marki nie istnieją w czasie wykonania; są po to, żeby nie dało się podać
   długości odstępu tam, gdzie oczekiwany jest numer dnia. Taką pomyłkę
   popełnialiśmy w starej wersji. */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Dzień jako liczba dni od epoki, liczony w czasie lokalnym. */
export type DayNumber = Brand<number, "DayNumber">;
/** Długość odstępu w dniach. */
export type Days = Brand<number, "Days">;
/** Dzień kalendarzowy "RRRR-MM-DD" w czasie lokalnym. */
export type DateKey = Brand<string, "DateKey">;
/** Klucz słowa: jego włoska postać. */
export type WordId = Brand<string, "WordId">;

export const asDayNumber = (n: number): DayNumber => n as DayNumber;
export const asDays = (n: number): Days => n as Days;
export const asDateKey = (s: string): DateKey => s as DateKey;
export const asWordId = (s: string): WordId => s as WordId;

/* ---------- materiał ---------- */

/** Poziom trudności materiału: 1 podstawy, 2 rozszerzenie, 3 konwersacja. */
export type Level = 1 | 2 | 3;

export type Word = {
  readonly id: WordId;
  /** Postać włoska — dokładnie to, co widać na karcie i co czyta syntezator. */
  readonly it: string;
  /** Wymowa zapisana polską fonetyką. */
  readonly pr: string;
  /** Znaczenie po polsku. */
  readonly pl: string;
  readonly category: string;
  readonly level: Level;
  /** Kolejność wprowadzania: im mniej, tym częstsze słowo. */
  readonly order: number;
};

export type Sentence = {
  readonly it: string;
  readonly pl: string;
  /** Słowo chowane w luce; zawsze występuje w `it`. */
  readonly gap: string;
  readonly level: Level;
};

export type Deck = {
  readonly words: readonly Word[];
  readonly sentences: readonly Sentence[];
  readonly categories: readonly string[];
};

/* ---------- postęp ---------- */

/** Stan powtórek jednego słowa. Brak wpisu znaczy "jeszcze nie wprowadzone". */
export type Review = {
  /** Współczynnik łatwości, jak w SM-2. */
  readonly ease: number;
  readonly interval: Days;
  readonly due: DayNumber;
  readonly reps: number;
  readonly lapses: number;
};

export type Progress = ReadonlyMap<WordId, Review>;

/** Ile fiszek zrobiono danego dnia. */
export type DailyCounts = ReadonlyMap<DateKey, number>;

export type Grade = "again" | "hard" | "good" | "easy";

/** Stan słowa pokazywany w statystykach. */
export type WordState = "untouched" | "learning" | "young" | "mature";

/* ---------- ćwiczenia ---------- */

export type Choice = {
  readonly text: string;
  readonly correct: boolean;
};

export type GapSplit = {
  readonly before: string;
  readonly after: string;
};

/**
 * Forma ćwiczenia wraz z dokładnie tymi danymi, których potrzebuje.
 * Nie da się zbudować luki bez zdania ani testu wyboru bez odpowiedzi.
 */
export type Exercise =
  | { readonly kind: "card"; readonly word: Word; readonly review: Review | null }
  | {
      readonly kind: "choice";
      readonly word: Word;
      readonly direction: "it-pl" | "pl-it";
      readonly choices: readonly Choice[];
    }
  | { readonly kind: "listen"; readonly word: Word; readonly choices: readonly Choice[] }
  | { readonly kind: "type"; readonly word: Word; readonly accepted: readonly string[] }
  | {
      readonly kind: "cloze";
      readonly word: Word;
      readonly sentence: Sentence;
      readonly split: GapSplit;
      readonly choices: readonly Choice[];
    };

export type ExerciseKind = Exercise["kind"];

/** Wynik wpisywania rozróżnia literówkę od błędu — liczą się inaczej. */
export type TypedAnswer =
  | { readonly outcome: "exact" }
  | { readonly outcome: "typo" }
  | { readonly outcome: "wrong" };

/**
 * Etap karty. Poprzednio były to trzy niezależne flagi plus atrybuty `hidden`
 * na pięciu elementach — mogły się rozjechać i rozjeżdżały się.
 */
export type Phase =
  | { readonly phase: "question" }
  | { readonly phase: "answered"; readonly correct: boolean };

/* ---------- sesja ---------- */

/** Dlaczego sesja się skończyła — każdy powód ma inny ekran końcowy. */
export type DoneReason =
  /** Dzienna kolejka wyczerpana. */
  | "daily-finished"
  /** Trening trudnych przerobiony do końca. */
  | "hard-finished"
  /** Nie ma ani jednego trudnego słowa, więc nie było czego trenować. */
  | "no-leeches";

/** Czym jest bieżąca sesja: dzienna kolejka, same fiszki, albo trening trudnych. */
export type SessionKind = "mix" | "cards" | "hard";

export type Session =
  | {
      readonly status: "active";
      readonly kind: SessionKind;
      readonly current: Exercise;
      readonly phase: Phase;
      /** Słowa czekające po bieżącym. */
      readonly queue: readonly Word[];
      /** Karty zaliczone w tej sesji — "Nie wiem" nie zalicza. */
      readonly passed: number;
    }
  | {
      readonly status: "done";
      readonly kind: SessionKind;
      readonly reason: DoneReason;
      readonly nextDue: Days | null;
      readonly newInReserve: number;
    };

/* ---------- konto i synchronizacja ---------- */

export type Username = Brand<string, "Username">;

export type BoardRow = {
  readonly username: Username;
  readonly today: number;
  readonly mature: number;
};

export type Sync =
  | { readonly status: "unconfigured" }
  | { readonly status: "signed-out" }
  | {
      readonly status: "signed-in";
      readonly username: Username;
      readonly board: readonly BoardRow[];
      readonly goal: { readonly target: number; readonly total: number; readonly streak: number };
    }
  | { readonly status: "error"; readonly message: string };

/* ---------- wynik operacji, która może się nie udać ---------- */

export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Wymusza obsłużenie każdego wariantu unii; nieobsłużony nie skompiluje się. */
export function assertNever(value: never, message = "nieobsłużony wariant"): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
