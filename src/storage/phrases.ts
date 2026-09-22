/**
 * Zapis rozmówek. Osobne klucze niż słowa: postęp zdań nie miesza się ze
 * statystykami słownictwa („utrwalone 40/1914" ma dalej liczyć słowa).
 */

import type { DateKey } from "../domain/types.js";
import { asDateKey } from "../domain/types.js";
import type { PhraseProgress, SceneId } from "../domain/phrases/types.js";
import { asPhraseId, asSceneId } from "../domain/phrases/types.js";
import type { KeyValueStore } from "../ports/storage.js";
import { asFiniteNumber, asText, isRecord } from "./codec.js";
import { decodeReviews, encodeReviews } from "./progress.js";

export const PHRASE_KEYS = {
  progress: "it250.phrases",
  newDay: "it250.phraseDay",
  limit: "it250.phraseLimit",
  scene: "it250.scene",
} as const;

export const PHRASE_LIMITS = [3, 5, 8, 10] as const;
export type PhraseLimit = (typeof PHRASE_LIMITS)[number];
export const DEFAULT_PHRASE_LIMIT: PhraseLimit = 5;

export type SavedPhrases = {
  readonly progress: PhraseProgress;
  readonly newDay: { readonly key: DateKey; readonly value: number };
  readonly limit: PhraseLimit;
  readonly scene: SceneId | null;
};

const asLimit = (value: unknown): PhraseLimit | null => {
  const n = asFiniteNumber(value);
  return n !== null && (PHRASE_LIMITS as readonly number[]).includes(n) ? (n as PhraseLimit) : null;
};

export function loadPhrases(store: KeyValueStore): SavedPhrases {
  const day = store.read(PHRASE_KEYS.newDay);
  const scene = asText(store.read(PHRASE_KEYS.scene));
  return {
    progress: decodeReviews(store.read(PHRASE_KEYS.progress), asPhraseId),
    newDay: {
      key: asDateKey(isRecord(day) && typeof day["k"] === "string" ? day["k"] : ""),
      value: isRecord(day) ? Math.max(0, asFiniteNumber(day["n"]) ?? 0) : 0,
    },
    limit: asLimit(store.read(PHRASE_KEYS.limit)) ?? DEFAULT_PHRASE_LIMIT,
    scene: scene === null ? null : asSceneId(scene),
  };
}

export const savePhraseProgress = (store: KeyValueStore, progress: PhraseProgress): void =>
  store.write(PHRASE_KEYS.progress, encodeReviews(progress));

export const savePhraseDay = (store: KeyValueStore, key: DateKey, value: number): void =>
  store.write(PHRASE_KEYS.newDay, { k: key, n: value });

export const savePhraseLimit = (store: KeyValueStore, limit: PhraseLimit): void =>
  store.write(PHRASE_KEYS.limit, limit);

export const saveScene = (store: KeyValueStore, scene: SceneId): void =>
  store.write(PHRASE_KEYS.scene, scene);
