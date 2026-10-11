/**
 * Zapis nauki historii — osobne klucze, żeby nie mieszać się z włoskim taty
 * ani z angielskim Marty w tej samej przeglądarce.
 */

import type { DailyCounts, DateKey } from "../domain/types.js";
import { asDateKey } from "../domain/types.js";
import type { FactProgress } from "../domain/facts/types.js";
import { asFactId } from "../domain/facts/types.js";
import type { KeyValueStore } from "../ports/storage.js";
import { asFiniteNumber, isRecord } from "../storage/codec.js";
import { decodeCounts, decodeReviews, encodeCounts, encodeReviews } from "../storage/progress.js";
import type { Scope } from "./facts.js";

export const KEYS = {
  progress: "historia.facts",
  counts: "historia.days",
  newDay: "historia.day",
  scope: "historia.scope",
  limit: "historia.limit",
} as const;

export const LIMITS = [5, 10, 15, 20] as const;
export type NewLimit = (typeof LIMITS)[number];
export const DEFAULT_LIMIT: NewLimit = 10;

export type Saved = {
  readonly progress: FactProgress;
  readonly counts: DailyCounts;
  readonly newDay: { readonly key: DateKey; readonly value: number };
  readonly scope: Scope;
  readonly limit: NewLimit;
};

const asScope = (value: unknown): Scope =>
  value === 1 || value === 2 || value === 3 || value === "all" ? value : "all";

const asLimit = (value: unknown): NewLimit => {
  const n = asFiniteNumber(value);
  return n !== null && (LIMITS as readonly number[]).includes(n) ? (n as NewLimit) : DEFAULT_LIMIT;
};

export function loadSaved(store: KeyValueStore): Saved {
  const day = store.read(KEYS.newDay);
  return {
    progress: decodeReviews(store.read(KEYS.progress), asFactId),
    counts: decodeCounts(store.read(KEYS.counts)),
    newDay: {
      key: asDateKey(isRecord(day) && typeof day["k"] === "string" ? day["k"] : ""),
      value: isRecord(day) ? Math.max(0, asFiniteNumber(day["n"]) ?? 0) : 0,
    },
    scope: asScope(store.read(KEYS.scope)),
    limit: asLimit(store.read(KEYS.limit)),
  };
}

export const saveProgress = (store: KeyValueStore, progress: FactProgress): void =>
  store.write(KEYS.progress, encodeReviews(progress));
export const saveCounts = (store: KeyValueStore, counts: DailyCounts): void =>
  store.write(KEYS.counts, encodeCounts(counts));
export const saveNewDay = (store: KeyValueStore, key: DateKey, value: number): void =>
  store.write(KEYS.newDay, { k: key, n: value });
export const saveScope = (store: KeyValueStore, scope: Scope): void => store.write(KEYS.scope, scope);
export const saveLimit = (store: KeyValueStore, limit: NewLimit): void => store.write(KEYS.limit, limit);
