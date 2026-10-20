/** Zapis gry w wieki: własne klucze `wieki.*`, odczyt odporny na śmieci. */

import type { KeyValueStore } from "../ports/storage.js";

export const KEYS = {
  both: "wieki.both",
  famous: "wieki.famous",
  stars: "wieki.stars",
  best: "wieki.best",
} as const;

export type Settings = { readonly both: boolean; readonly famous: boolean };

const flag = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

const count = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

export function readSettings(store: KeyValueStore): Settings {
  return { both: flag(store.read(KEYS.both), false), famous: flag(store.read(KEYS.famous), true) };
}

export const readStars = (store: KeyValueStore): number => count(store.read(KEYS.stars));

/** Najdłuższa seria dobrych odpowiedzi. */
export const readBest = (store: KeyValueStore): number => count(store.read(KEYS.best));
