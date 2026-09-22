import { asDateKey, asDayNumber, asDays, type DateKey, type DayNumber, type Days } from "./types";

const MS_PER_DAY = 86_400_000;

/**
 * Wszystko liczymy w czasie lokalnym: dzień nauki kończy się o północy u użytkownika,
 * nie w UTC. Stąd przesunięcie o strefę przed dzieleniem.
 */
const localMillis = (now: Date): number => now.getTime() - now.getTimezoneOffset() * 60_000;

export const dayNumberOf = (now: Date): DayNumber =>
  asDayNumber(Math.floor(localMillis(now) / MS_PER_DAY));

export const dateKeyOf = (now: Date): DateKey =>
  asDateKey(new Date(localMillis(now)).toISOString().slice(0, 10));

/** Klucz dnia oddalonego o `offset` dni (ujemny = wstecz). */
export const shiftKey = (now: Date, offset: number): DateKey =>
  dateKeyOf(new Date(now.getTime() + offset * MS_PER_DAY));

export const addDays = (day: DayNumber, days: Days): DayNumber => asDayNumber(day + days);

export const daysBetween = (from: DayNumber, to: DayNumber): Days => asDays(to - from);

/** Ile dni z rzędu, licząc wstecz, ma niezerowy wynik. Dziś bez wyniku nie łamie serii. */
export function streakLength(
  counts: ReadonlyMap<DateKey, number>,
  now: Date,
  meets: (count: number) => boolean = (c) => c > 0,
): number {
  const value = (offset: number): number => counts.get(shiftKey(now, offset)) ?? 0;
  let offset = meets(value(0)) ? 0 : -1;
  let length = 0;
  while (meets(value(offset))) {
    length += 1;
    offset -= 1;
  }
  return length;
}
