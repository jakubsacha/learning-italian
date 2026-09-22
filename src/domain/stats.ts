/**
 * Liczby na zakładkę Postęp i na pasek sesji. Same wyliczenia — rysowanie
 * i formatowanie tekstu należą do komponentów.
 */

import type {
  DailyCounts,
  DateKey,
  DayNumber,
  Progress,
  Session,
  Word,
  WordState,
} from "./types.js";
import { shiftKey, streakLength } from "./day.js";
import { isLeech, stateOf } from "./scheduler.js";

/** Ile dni wstecz pokazuje wykres aktywności. */
export const ACTIVITY_DAYS = 30;
/** Na ile dni naprzód pokazujemy plan powtórek. */
export const FORECAST_DAYS = 14;
/** Ile dni trzymamy w historii, zanim najstarsze wypadną. */
export const HISTORY_LIMIT = 180;
/** Ile kategorii mieści się na liście. */
export const CATEGORY_ROWS = 12;
/** Ile najtrudniejszych słów wypisujemy. */
export const HARDEST_ROWS = 15;

export type StateCounts = Readonly<Record<WordState, number>>;

export type ActivityDay = { readonly key: DateKey; readonly count: number };
export type ForecastDay = { readonly offset: number; readonly count: number };
export type CategoryProgress = {
  readonly category: string;
  readonly total: number;
  readonly done: number;
};
export type HardWord = { readonly word: Word; readonly lapses: number };

export type Stats = {
  readonly total: number;
  readonly byState: StateCounts;
  /** Wszystko, co kiedykolwiek było na ekranie — czyli poza "nietknięte". */
  readonly seen: number;
  readonly streak: number;
  readonly activity: readonly ActivityDay[];
  readonly activityTotal: number;
  readonly activeDays: number;
  readonly bestDay: number;
  readonly forecast: readonly ForecastDay[];
  readonly dueThisWeek: number;
  readonly categories: readonly CategoryProgress[];
  readonly hardest: readonly HardWord[];
};

export function countStates(words: readonly Word[], progress: Progress): StateCounts {
  const counts = { untouched: 0, learning: 0, young: 0, mature: 0 };
  for (const word of words) counts[stateOf(progress.get(word.id))] += 1;
  return counts;
}

export function activityOf(counts: DailyCounts, now: Date, days = ACTIVITY_DAYS): readonly ActivityDay[] {
  return Array.from({ length: days }, (_, i) => {
    const key = shiftKey(now, i - (days - 1));
    return { key, count: counts.get(key) ?? 0 };
  });
}

export function forecastOf(
  words: readonly Word[],
  progress: Progress,
  today: DayNumber,
  days = FORECAST_DAYS,
): readonly ForecastDay[] {
  const buckets = Array.from({ length: days }, () => 0);
  for (const word of words) {
    const review = progress.get(word.id);
    if (review === undefined) continue;
    // Zaległe trafiają do dzisiejszego słupka — i tak są do zrobienia dziś.
    const offset = Math.max(0, review.due - today);
    if (offset < days) buckets[offset] = (buckets[offset] ?? 0) + 1;
  }
  return buckets.map((count, offset) => ({ offset, count }));
}

export function categoriesOf(
  words: readonly Word[],
  progress: Progress,
  categories: readonly string[],
): readonly CategoryProgress[] {
  return categories
    .map((category) => {
      const inCategory = words.filter((w) => w.category === category);
      return {
        category,
        total: inCategory.length,
        done: inCategory.filter((w) => stateOf(progress.get(w.id)) !== "untouched").length,
      };
    })
    // Nieruszone kategorie tylko zaśmiecają listę.
    .filter((row) => row.done > 0)
    .sort((a, b) => b.done / b.total - a.done / a.total || b.done - a.done)
    .slice(0, CATEGORY_ROWS);
}

export const hardestOf = (words: readonly Word[], progress: Progress, rows = HARDEST_ROWS): readonly HardWord[] =>
  words
    .filter((w) => isLeech(progress.get(w.id)))
    .map((word) => ({ word, lapses: progress.get(word.id)?.lapses ?? 0 }))
    .sort((a, b) => b.lapses - a.lapses)
    .slice(0, rows);

export function statsOf(
  words: readonly Word[],
  categories: readonly string[],
  progress: Progress,
  counts: DailyCounts,
  now: Date,
  today: DayNumber,
): Stats {
  const byState = countStates(words, progress);
  const activity = activityOf(counts, now);
  const forecast = forecastOf(words, progress, today);
  const totals = activity.map((d) => d.count);
  return {
    total: words.length,
    byState,
    seen: words.length - byState.untouched,
    streak: streakLength(counts, now),
    activity,
    activityTotal: totals.reduce((a, b) => a + b, 0),
    activeDays: totals.filter((n) => n > 0).length,
    bestDay: Math.max(0, ...totals),
    forecast,
    dueThisWeek: forecast.slice(0, 7).reduce((sum, d) => sum + d.count, 0),
    categories: categoriesOf(words, progress, categories),
    hardest: hardestOf(words, progress),
  };
}

/** Historia bez najstarszych dni — inaczej rośnie w nieskończoność. */
export function trimHistory(counts: DailyCounts, limit = HISTORY_LIMIT): DailyCounts {
  if (counts.size <= limit) return counts;
  const keys = [...counts.keys()].sort();
  return new Map(keys.slice(keys.length - limit).map((k) => [k, counts.get(k) ?? 0]));
}

/* ---------- pasek sesji ---------- */

export type SessionSummary = {
  /** Karty jeszcze do zrobienia, razem z bieżącą. */
  readonly left: number;
  readonly passed: number;
  /** Mianownik: zaliczone plus to, co zostało. Nie rośnie z każdą odpowiedzią. */
  readonly total: number;
  readonly fresh: number;
  readonly tough: number;
  readonly again: number;
  readonly percent: number;
};

export function summarise(session: Session, progress: Progress): SessionSummary {
  if (session.status === "done") {
    return { left: 0, passed: 0, total: 0, fresh: 0, tough: 0, again: 0, percent: 100 };
  }
  // Po odpowiedzi bieżąca karta jest już policzona: albo trafiła do `passed`,
  // albo wróciła do kolejki. Liczenie jej ponownie rozdmuchiwałoby mianownik.
  const rest =
    session.phase.phase === "answered"
      ? session.queue
      : [session.current.word, ...session.queue];
  const fresh = rest.filter((w) => !progress.has(w.id)).length;
  const tough = rest.filter((w) => progress.has(w.id) && isLeech(progress.get(w.id))).length;
  const total = session.passed + rest.length;
  return {
    left: rest.length,
    passed: session.passed,
    total,
    fresh,
    tough,
    again: rest.length - fresh - tough,
    percent: total === 0 ? 100 : (session.passed / total) * 100,
  };
}
