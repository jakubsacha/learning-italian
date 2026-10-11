/**
 * Materiał z historii: rozdział I podręcznika (tematy 1–2) i wkładka
 * „Dlaczego Niemcy nie zdobyli Anglii?". Spisany ze zdjęć stron 8–21 — trzyma
 * się książki, nie dodaje faktów spoza niej.
 */

import type { AnswerKind, Fact, Lesson } from "../domain/facts/types.js";
import { asFactId } from "../domain/facts/types.js";
import { asBoolean, asFiniteNumber, asOneOf, asText, isRecord } from "../storage/codec.js";
import raw from "./facts.json";

const KINDS: readonly AnswerKind[] = [
  "data", "osoba", "miejsce", "bitwa", "panstwa", "nazwa", "pojecie", "liczba", "wyjasnienie",
];

export const LESSONS: Readonly<Record<Lesson, string>> = {
  1: "Napaść na Polskę",
  2: "Podbój Europy przez Hitlera i Stalina (1939–1941)",
  3: "Dlaczego Niemcy nie zdobyli Anglii?",
};

const asLesson = (value: unknown): Lesson | null => {
  const n = asFiniteNumber(value);
  return n === 1 || n === 2 || n === 3 ? n : null;
};

function decodeFact(value: unknown, order: number): Fact | null {
  if (!isRecord(value)) return null;
  const q = asText(value["q"]);
  const a = asText(value["a"]);
  const kind = asOneOf(value["kind"], KINDS);
  const lesson = asLesson(value["lesson"]);
  if (q === null || a === null || kind === null || lesson === null) return null;
  const when = asFiniteNumber(value["when"]);
  const label = asText(value["event"]);
  return {
    id: asFactId(q),
    q,
    a,
    kind,
    key: asBoolean(value["key"]) ?? false,
    lesson,
    section: asText(value["section"]) ?? "",
    page: asFiniteNumber(value["page"]),
    event: when !== null && label !== null ? { when, label } : null,
    order,
  };
}

export const FACTS: readonly Fact[] = (raw as unknown[])
  .map(decodeFact)
  .filter((f): f is Fact => f !== null);

/** Zakres nauki: jeden temat albo wszystko naraz. */
export type Scope = Lesson | "all";

export const inScope = (scope: Scope): readonly Fact[] =>
  scope === "all" ? FACTS : FACTS.filter((f) => f.lesson === scope);
