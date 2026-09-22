/**
 * Materiał kursu. Na dysku leży JSON w skróconym zapisie (`it`, `pr`, `pl`,
 * `c`, `l`, `o`) — taki sam jak w poprzedniej wersji. Tutaj przechodzi przez
 * dekoder i dalej w aplikacji istnieje już tylko jako `Deck`.
 */

import type { Deck, Level, Sentence, Word } from "../domain/types.js";
import { asWordId } from "../domain/types.js";
import { asFiniteNumber, asText, isRecord } from "../storage/codec.js";
import rawWords from "./words.json";
import rawSentences from "./sentences.json";
import rawCategories from "./categories.json";

const asLevel = (value: unknown): Level => {
  const n = asFiniteNumber(value);
  return n === 2 || n === 3 ? n : 1;
};

function decodeWord(value: unknown, index: number): Word | null {
  if (!isRecord(value)) return null;
  const it = asText(value["it"]);
  const pl = asText(value["pl"]);
  if (it === null || pl === null) return null;
  return {
    id: asWordId(it),
    it,
    pl,
    pr: asText(value["pr"]) ?? it,
    category: asText(value["c"]) ?? "",
    level: asLevel(value["l"]),
    // Bez kolejności słowo ląduje na końcu, zamiast wypadać z kursu.
    order: asFiniteNumber(value["o"]) ?? 9000 + index,
  };
}

function decodeSentence(value: unknown): Sentence | null {
  if (!isRecord(value)) return null;
  const it = asText(value["it"]);
  const pl = asText(value["pl"]);
  const gap = asText(value["gap"]);
  // Zdanie bez luki albo z luką, której w nim nie ma, nie nadaje się do ćwiczenia.
  if (it === null || pl === null || gap === null) return null;
  if (!it.toLowerCase().includes(gap.toLowerCase())) return null;
  return { it, pl, gap, level: asLevel(value["l"]) };
}

const notNull = <T>(value: T | null): value is T => value !== null;

const words: readonly Word[] = (rawWords as unknown[]).map(decodeWord).filter(notNull);
const sentences: readonly Sentence[] = (rawSentences as unknown[])
  .map(decodeSentence)
  .filter(notNull);

/** Kategorie w kolejności z pliku, ale tylko te, które mają jakieś słowa. */
const used = new Set(words.map((w) => w.category));
const categories: readonly string[] = (rawCategories as unknown[])
  .map(asText)
  .filter(notNull)
  .filter((c) => used.has(c));

export const DECK: Deck = { words, sentences, categories };

/** Zdania, w których da się schować dane słowo. */
const byGap = new Map<string, Sentence[]>();
for (const sentence of sentences) {
  const key = sentence.gap.toLowerCase();
  const list = byGap.get(key);
  if (list === undefined) byGap.set(key, [sentence]);
  else list.push(sentence);
}

export const sentencesFor = (word: Word): readonly Sentence[] =>
  byGap.get(word.it.toLowerCase()) ?? [];
