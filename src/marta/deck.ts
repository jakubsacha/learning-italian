/**
 * Materiał Marty: angielski od zera. Ten sam kształt danych co kurs włoski —
 * `Word.it` trzyma postać w języku obcym, więc cała domena (harmonogram,
 * kolejka, dobór ćwiczeń) działa tu bez jednej zmiany.
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
  const en = asText(value["en"]);
  const pl = asText(value["pl"]);
  if (en === null || pl === null) return null;
  return {
    id: asWordId(en),
    it: en,
    pl,
    pr: asText(value["pr"]) ?? en,
    category: asText(value["c"]) ?? "",
    level: asLevel(value["l"]),
    order: asFiniteNumber(value["o"]) ?? 9000 + index,
  };
}

function decodeSentence(value: unknown): Sentence | null {
  if (!isRecord(value)) return null;
  const en = asText(value["en"]);
  const pl = asText(value["pl"]);
  const gap = asText(value["gap"]);
  if (en === null || pl === null || gap === null) return null;
  if (!en.toLowerCase().includes(gap.toLowerCase())) return null;
  return { it: en, pl, gap, level: asLevel(value["l"]) };
}

const notNull = <T>(value: T | null): value is T => value !== null;

const words: readonly Word[] = (rawWords as unknown[]).map(decodeWord).filter(notNull);
const sentences: readonly Sentence[] = (rawSentences as unknown[])
  .map(decodeSentence)
  .filter(notNull);

const used = new Set(words.map((w) => w.category));
const categories: readonly string[] = (rawCategories as unknown[])
  .map(asText)
  .filter(notNull)
  .filter((c) => used.has(c));

export const DECK: Deck = { words, sentences, categories };

const byGap = new Map<string, Sentence[]>();
for (const sentence of sentences) {
  const key = sentence.gap.toLowerCase();
  const list = byGap.get(key);
  if (list === undefined) byGap.set(key, [sentence]);
  else list.push(sentence);
}

export const sentencesFor = (word: Word): readonly Sentence[] =>
  byGap.get(word.it.toLowerCase()) ?? [];

/**
 * Do wpisania nadają się tylko krótkie, jednowyrazowe hasła. Ośmiolatka nie ma
 * przepisywać „What is your name?" litera po literze, żeby zaliczyć kartę.
 */
export const canType = (word: Word): boolean =>
  !word.it.includes(" ") && !word.it.includes("?") && word.it.length <= 9;
