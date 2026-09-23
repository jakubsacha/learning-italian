/**
 * Wszystko, co aplikacja pamięta między wizytami, w jednym typie i z jednym
 * miejscem na dekodowanie. Klucze zostają takie jak w poprzedniej wersji —
 * po podmianie aplikacji postęp ma się znaleźć na swoim miejscu, a nie zniknąć.
 */

import type {
  DailyCounts,
  DateKey,
  Progress,
  SessionKind,
  WordId,
} from "../domain/types.js";
import { asDateKey, asWordId } from "../domain/types.js";
import type { KeyValueStore } from "../ports/storage.js";
import {
  asBoolean,
  asFiniteNumber,
  asNonNegativeInt,
  asOneOf,
  asTextList,
  isRecord,
} from "./codec.js";
import {
  decodeCounts,
  decodeProgress,
  encodeCounts,
  encodeProgress,
  migrateFromBoxes,
} from "./progress.js";

export const KEYS = {
  progress: "it250.srs",
  counts: "it250.days",
  newDay: "it250.day",
  limit: "it250.limit",
  categories: "it250.cats",
  kind: "it250.kind",
  theme: "it250.theme",
  voice: "it250.voice",
  seen: "it250.seen",
  /** Format sprzed wprowadzenia odstępów; czytany raz, przy migracji. */
  legacyBoxes: "it250.box",
} as const;

export const LIMITS = [5, 10, 15, 20, 30] as const;
export type NewLimit = (typeof LIMITS)[number];
export const DEFAULT_LIMIT: NewLimit = 10;

export type Theme = "light" | "dark";
const THEMES: readonly Theme[] = ["light", "dark"];
// Starsze wersje zapisywały tu jeszcze "cards" (zakładka Fiszki). Ta wartość nie
// przejdzie dekodera i wracamy do zwykłej nauki — nic się nie wysypie.
const KINDS: readonly SessionKind[] = ["mix", "review", "new", "hard"];

/** Licznik przypisany do dnia. Poza swoim dniem nie znaczy nic i wraca do zera. */
export type DayScoped<T> = { readonly key: DateKey; readonly value: T };

export type Saved = {
  readonly progress: Progress;
  readonly counts: DailyCounts;
  /** Ile nowych słów wprowadzono danego dnia — pilnuje dziennego limitu. */
  readonly newDay: DayScoped<number>;
  readonly limit: NewLimit;
  /** `null` znaczy "wszystkie kategorie", co jest czymś innym niż pusta lista. */
  readonly categories: readonly string[] | null;
  readonly kind: SessionKind;
  readonly theme: Theme | null;
  readonly voice: boolean;
  /** Co już dziś było na ekranie — inaczej trudne słowa wracają po odświeżeniu. */
  readonly seen: DayScoped<ReadonlySet<WordId>>;
};

const asLimit = (value: unknown): NewLimit | null => {
  const n = asFiniteNumber(value);
  return n !== null && (LIMITS as readonly number[]).includes(n) ? (n as NewLimit) : null;
};

const decodeDayScoped = <T>(value: unknown, field: string, decode: (raw: unknown) => T | null, fallback: T): DayScoped<T> => {
  if (!isRecord(value)) return { key: asDateKey(""), value: fallback };
  const key = typeof value["k"] === "string" ? value["k"] : "";
  return { key: asDateKey(key), value: decode(value[field]) ?? fallback };
};

export function loadSaved(store: KeyValueStore): Saved {
  const rawProgress = store.read(KEYS.progress);
  // Brak nowego klucza znaczy albo pierwszą wizytę, albo wersję sprzed odstępów.
  const progress = rawProgress === undefined
    ? migrateFromBoxes(store.read(KEYS.legacyBoxes))
    : decodeProgress(rawProgress);

  const categories = asTextList(store.read(KEYS.categories));
  return {
    progress,
    counts: decodeCounts(store.read(KEYS.counts)),
    newDay: decodeDayScoped(store.read(KEYS.newDay), "n", asNonNegativeInt, 0),
    limit: asLimit(store.read(KEYS.limit)) ?? DEFAULT_LIMIT,
    categories: categories === null || categories.length === 0 ? null : categories,
    kind: asOneOf(store.read(KEYS.kind), KINDS) ?? "mix",
    theme: asOneOf(store.read(KEYS.theme), THEMES),
    voice: asBoolean(store.read(KEYS.voice)) ?? true,
    seen: decodeDayScoped(
      store.read(KEYS.seen),
      "w",
      (raw) => {
        const list = asTextList(raw);
        return list === null ? null : new Set(list.map(asWordId));
      },
      new Set<WordId>(),
    ),
  };
}

/** Wartość przypisana do dnia, ale tylko jeśli to wciąż ten sam dzień. */
export const scopedTo = <T>(scoped: DayScoped<T>, today: DateKey, fallback: T): T =>
  scoped.key === today ? scoped.value : fallback;

export const saveProgress = (store: KeyValueStore, progress: Progress): void =>
  store.write(KEYS.progress, encodeProgress(progress));

export const saveCounts = (store: KeyValueStore, counts: DailyCounts): void =>
  store.write(KEYS.counts, encodeCounts(counts));

export const saveNewDay = (store: KeyValueStore, day: DayScoped<number>): void =>
  store.write(KEYS.newDay, { k: day.key, n: day.value });

export const saveSeen = (store: KeyValueStore, seen: DayScoped<ReadonlySet<WordId>>): void =>
  store.write(KEYS.seen, { k: seen.key, w: [...seen.value] });

export const saveLimit = (store: KeyValueStore, limit: NewLimit): void =>
  store.write(KEYS.limit, limit);

export const saveCategories = (store: KeyValueStore, categories: readonly string[] | null): void =>
  store.write(KEYS.categories, categories);

export const saveKind = (store: KeyValueStore, kind: SessionKind): void =>
  store.write(KEYS.kind, kind);

export const saveTheme = (store: KeyValueStore, theme: Theme): void =>
  store.write(KEYS.theme, theme);

export const saveVoice = (store: KeyValueStore, voice: boolean): void =>
  store.write(KEYS.voice, voice);
