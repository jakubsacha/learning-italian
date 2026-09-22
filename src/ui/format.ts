/** Napisy widoczne na ekranie. Same łańcuchy, żadnych obliczeń. */

import { withCount } from "../domain/text.js";
import type { Days, DateKey } from "../domain/types.js";

export const cards = (n: number): string => withCount(n, "karta", "karty", "kart");
export const flashcards = (n: number): string => withCount(n, "fiszka", "fiszki", "fiszek");
export const days = (n: number): string => withCount(n, "dzień", "dni", "dni");
export const reviews = (n: number): string => withCount(n, "powtórka", "powtórki", "powtórek");
export const newOnes = (n: number): string => withCount(n, "nowe słowo", "nowe słowa", "nowych słów");
export const tough = (n: number): string =>
  withCount(n, "trudne słowo", "trudne słowa", "trudnych słów");

/** Odstęp po ludzku: "jutro", "9 dni", "3 mies.". */
export const intervalLabel = (n: Days | number): string =>
  n <= 0 ? "za chwilę" : n === 1 ? "jutro" : n < 30 ? n + " dni" : Math.round(n / 30) + " mies.";

/** Odległość w przód: "dziś" albo tyle a tyle. */
export const whenLabel = (n: Days | number): string => (n <= 0 ? "dziś" : intervalLabel(n));

export const dayLabel = (offset: number): string =>
  offset === 0 ? "dziś" : "za " + days(offset);

export const percent = (part: number, whole: number): number =>
  whole === 0 ? 0 : (part / whole) * 100;

export const dateLabel = (key: DateKey): string => key;
