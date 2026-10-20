/** Zapis podstrony z angielskim: własne klucze `angielski.*`, odczyt odporny na śmieci. */

import type { KeyValueStore } from "../ports/storage.js";
import { CARDS, SECTIONS, type SectionId } from "./words.js";

export const KEYS = {
  sections: "angielski.sections",
  known: "angielski.known",
  stars: "angielski.stars",
} as const;

export const ALL: ReadonlySet<SectionId> = new Set(SECTIONS.map((s) => s.id));

const isSection = (v: unknown): v is SectionId => typeof v === "string" && ALL.has(v as SectionId);

export function readSections(store: KeyValueStore): ReadonlySet<SectionId> {
  const raw = store.read(KEYS.sections);
  const list = Array.isArray(raw) ? raw.filter(isSection) : [];
  return list.length > 0 ? new Set(list) : ALL;
}

export function readKnown(store: KeyValueStore): ReadonlySet<string> {
  const raw = store.read(KEYS.known);
  const words = new Set(CARDS.map((c) => c.en));
  return new Set(Array.isArray(raw) ? raw.filter((w): w is string => typeof w === "string" && words.has(w)) : []);
}

export function readStars(store: KeyValueStore): number {
  const raw = store.read(KEYS.stars);
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
}
