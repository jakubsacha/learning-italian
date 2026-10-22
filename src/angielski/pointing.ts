/**
 * Wskazywanie: this, that, these, those. Reguła z zeszytu:
 *   this  — liczba pojedyncza, blisko     that  — liczba pojedyncza, daleko
 *   these — liczba mnoga, blisko          those — liczba mnoga, daleko
 * Zdania to przykłady z zeszytu (z poprawioną pisownią) i kilka ze słówek z Unit 2.
 */

import { shuffle, type Rng } from "../domain/random.js";

export type Pointer = "this" | "that" | "these" | "those";

export const POINTERS: readonly Pointer[] = ["this", "that", "these", "those"];

export function pointer(many: boolean, far: boolean): Pointer {
  if (many) return far ? "those" : "these";
  return far ? "that" : "this";
}

export const RULE: Readonly<Record<Pointer, string>> = {
  this: "jedna rzecz, blisko",
  that: "jedna rzecz, daleko",
  these: "wiele rzeczy, blisko",
  those: "wiele rzeczy, daleko",
};

export type Sentence = {
  /** Zdanie z luką `___` w miejscu this/that/these/those. */
  readonly en: string;
  /** Tłumaczenie, gdy rzecz jest blisko i gdy daleko. */
  readonly near: string;
  readonly far: string;
  readonly emoji: string;
  readonly many: boolean;
  /** Ile obrazków narysować. „Glasses" to jedna rzecz, ale po angielsku zawsze mnoga. */
  readonly count: number;
  readonly from: "zeszyt" | "unit2";
};

const s = (
  en: string,
  emoji: string,
  many: boolean,
  near: string,
  far: string,
  from: Sentence["from"] = "zeszyt",
  count = many ? 3 : 1,
): Sentence => ({ en, emoji, many, near, far, from, count });

export const SENTENCES: readonly Sentence[] = [
  s("___ is my school.", "🏫", false, "To (tutaj) jest moja szkoła.", "To (tam) jest moja szkoła."),
  s("___ is my new laptop.", "💻", false, "To (tutaj) jest mój nowy laptop.", "To (tam) jest mój nowy laptop."),
  s("___ are books on the shelf.", "📕", true, "To (tutaj) są książki na półce.", "To (tam) są książki na półce."),
  s("___ are your dirty shoes.", "👟", true, "To (tutaj) są twoje brudne buty.", "To (tam) są twoje brudne buty."),
  s("___ are black shoes.", "👞", true, "To (tutaj) są czarne buty.", "To (tam) są czarne buty."),
  s("___ are my cats.", "🐱", true, "To (tutaj) są moje koty.", "To (tam) są moje koty."),
  s("___ is an umbrella.", "☂️", false, "To (tutaj) jest parasol.", "To (tam) jest parasol."),
  s("___ stars are beautiful.", "⭐", true, "Te gwiazdy są piękne.", "Tamte gwiazdy są piękne."),
  s("Are ___ my reading glasses?", "👓", true, "Czy to (tutaj) są moje okulary do czytania?", "Czy to (tam) są moje okulary do czytania?", "zeszyt", 1),
  s("___ are delicious cupcakes!", "🧁", true, "To (tutaj) są pyszne babeczki!", "To (tam) są pyszne babeczki!"),
  s("___ is my cap.", "🧢", false, "To (tutaj) jest moja czapka.", "To (tam) jest moja czapka.", "unit2"),
  s("___ is my backpack.", "🎒", false, "To (tutaj) jest mój plecak.", "To (tam) jest mój plecak.", "unit2"),
  s("___ dress is cool.", "👗", false, "Ta sukienka jest fajna.", "Tamta sukienka jest fajna.", "unit2"),
  s("___ are my new trainers.", "👟", true, "To (tutaj) są moje nowe trampki.", "To (tam) są moje nowe trampki.", "unit2"),
  s("___ are my headphones.", "🎧", true, "To (tutaj) są moje słuchawki.", "To (tam) są moje słuchawki.", "unit2", 1),
  s("___ jeans are old.", "👖", true, "Te dżinsy są stare.", "Tamte dżinsy są stare.", "unit2", 1),
];

/** Wstawia słowo w lukę; na początku zdania wielką literą. */
export function fill(sentence: Sentence, word: Pointer): string {
  const at = sentence.en.indexOf("___");
  const w = at === 0 ? word[0]?.toUpperCase() + word.slice(1) : word;
  return sentence.en.replace("___", w);
}

/** Zdanie do pokazania: luka jako widoczna kreska, z wielką literą na początku nieistotna. */
export const blank = (sentence: Sentence): string => sentence.en.replace("___", "_____");

export type PointQuestion = { readonly sentence: Sentence; readonly far: boolean };

export const answerOf = (q: PointQuestion): Pointer => pointer(q.sentence.many, q.far);

export const translation = (q: PointQuestion): string => (q.far ? q.sentence.far : q.sentence.near);

/** Wyjaśnienie: dlaczego to słowo. */
export function why(q: PointQuestion): string {
  const word = answerOf(q);
  const number = q.sentence.many
    ? q.sentence.count === 1
      ? "liczba mnoga (to słowo po angielsku zawsze jest w mnogiej)"
      : "wiele rzeczy"
    : "jedna rzecz";
  return `${number} + ${q.far ? "daleko" : "blisko"} → ${word}`;
}

/**
 * Runda: zdania bez powtórek, blisko i daleko na zmianę w losowej kolejności,
 * żeby nie dało się zgadywać po tym, co było przed chwilą.
 */
export function pointRound(rng: Rng, size = 10): PointQuestion[] {
  const picked = shuffle(SENTENCES, rng).slice(0, size);
  const sides = shuffle(picked.map((_, i) => i % 2 === 0), rng);
  return picked.map((sentence, i) => ({ sentence, far: sides[i] ?? false }));
}
