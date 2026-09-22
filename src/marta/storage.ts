/**
 * Zapis postępu Marty. Osobne klucze niż kurs włoski, więc obie nauki mogą
 * mieszkać w jednej przeglądarce i nic sobie nie nadpisują. Dekodery są te same
 * co w kursie głównym — uszkodzony wpis pomija siebie, a nie całą naukę.
 */

import type { DailyCounts, DateKey, Progress, WordId } from "../domain/types.js";
import { asDateKey, asWordId } from "../domain/types.js";
import type { KeyValueStore } from "../ports/storage.js";
import { asBoolean, asFiniteNumber, asTextList, isRecord } from "../storage/codec.js";
import {
  decodeCounts,
  decodeProgress,
  encodeCounts,
  encodeProgress,
} from "../storage/progress.js";

export const KEYS = {
  progress: "marta.srs",
  counts: "marta.days",
  newDay: "marta.day",
  seen: "marta.seen",
  voice: "marta.voice",
} as const;

/** Ile nowych słówek dziennie. Mało i codziennie bije dużo raz w tygodniu. */
export const NEW_PER_DAY = 6;

export type DayScoped<T> = { readonly key: DateKey; readonly value: T };

export type Saved = {
  readonly progress: Progress;
  readonly counts: DailyCounts;
  readonly newDay: DayScoped<number>;
  readonly seen: DayScoped<ReadonlySet<WordId>>;
  readonly voice: boolean;
};

const dayKeyOf = (value: unknown): DateKey =>
  asDateKey(isRecord(value) && typeof value["k"] === "string" ? value["k"] : "");

export function loadSaved(store: KeyValueStore): Saved {
  const newDay = store.read(KEYS.newDay);
  const seen = store.read(KEYS.seen);
  const seenList = isRecord(seen) ? asTextList(seen["w"]) : null;
  return {
    progress: decodeProgress(store.read(KEYS.progress)),
    counts: decodeCounts(store.read(KEYS.counts)),
    newDay: {
      key: dayKeyOf(newDay),
      value: isRecord(newDay) ? Math.max(0, asFiniteNumber(newDay["n"]) ?? 0) : 0,
    },
    seen: {
      key: dayKeyOf(seen),
      value: new Set((seenList ?? []).map(asWordId)),
    },
    voice: asBoolean(store.read(KEYS.voice)) ?? true,
  };
}

/** Wartość przypisana do dnia — poza swoim dniem nie znaczy nic. */
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

export const saveVoice = (store: KeyValueStore, voice: boolean): void =>
  store.write(KEYS.voice, voice);
