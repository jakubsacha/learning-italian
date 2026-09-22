/**
 * Dobór formy ćwiczenia dla kwestii, złożenie ćwiczenia i ocena odpowiedzi.
 * Drabinka jak przy słowach: najpierw rozpoznanie, potem produkcja — ale
 * produkcja tylko dla Twoich kwestii. Kwestie rozmówcy ćwiczysz do rozumienia.
 */

import type { Choice, Grade, Review } from "../types.js";
import { isLeech } from "../scheduler.js";
import { editDistance, normalise, type TypedOutcome } from "../text.js";
import { pick, shuffle, type Rng } from "../random.js";
import type {
  Phrase,
  PhraseAnswer,
  PhraseExercise,
  PhraseExerciseKind,
  PhraseGraded,
  Scene,
  Tile,
} from "./types.js";

/**
 * Waga dowodu, jak przy słowach: zapisanie zdania ze słuchu bez błędu znaczy
 * najwięcej, wybór znaczenia z czterech — najmniej, bo można trafić.
 */
export const PHRASE_EVIDENCE: Readonly<Record<PhraseExerciseKind, number>> = {
  dictation: 1.2,
  speak: 1,
  read: 1,
  order: 0.95,
  listen: 0.85,
};

export type PhraseFormContext = {
  readonly phrase: Phrase;
  readonly review: Review | undefined;
  /** Bez syntezatora nie ma słuchania ani dyktanda. */
  readonly canListen: boolean;
};

export function choosePhraseForm(ctx: PhraseFormContext, rng: Rng): PhraseExerciseKind {
  const { review, phrase, canListen } = ctx;
  if (review === undefined || review.reps < 1) return "read";
  const mine = phrase.who === "ty";

  if (isLeech(review)) {
    const easy: [PhraseExerciseKind, ...PhraseExerciseKind[]] = ["read"];
    if (canListen) easy.push("listen");
    if (mine) easy.push("order");
    return pick(easy, rng);
  }

  const forms: [PhraseExerciseKind, ...PhraseExerciseKind[]] = ["read"];
  if (canListen) forms.push("listen");
  if (mine) forms.push("order");
  if (review.reps >= 2) {
    // Mówienie z głowy to cel dla własnych kwestii, więc wypada dwa razy częściej.
    if (mine) forms.push("speak", "speak");
    if (canListen) forms.push("dictation");
  }
  return pick(forms, rng);
}

/** Słowa zdania jako klocki. Interpunkcja zostaje przy słowie, do którego należy. */
export const tilesOf = (text: string): readonly Tile[] =>
  text
    .split(/\s+/)
    .filter((t) => t !== "")
    .map((t, slot) => ({ text: t, slot }));

/** Rozsypanka, której nie trzeba układać, to nie rozsypanka. */
function scrambled(tiles: readonly Tile[], rng: Rng): readonly Tile[] {
  if (tiles.length < 2) return tiles;
  for (let attempt = 0; attempt < 8; attempt++) {
    const out = shuffle(tiles, rng);
    if (out.some((t, i) => t.slot !== i)) return out;
  }
  // Losowanie uparcie wraca do kolejności zdania — odwracamy ręcznie.
  return tiles.slice().reverse();
}

/** Trzy błędne znaczenia: najpierw z tej samej sytuacji, bo tam są najbardziej podobne. */
function meaningChoices(phrase: Phrase, scenes: readonly Scene[], rng: Rng): readonly Choice[] {
  const own = scenes.find((s) => s.id === phrase.scene)?.phrases ?? [];
  const others = scenes.filter((s) => s.id !== phrase.scene).flatMap((s) => s.phrases);
  const pool = [...shuffle(own, rng), ...shuffle(others, rng)]
    .filter((p) => p.id !== phrase.id && p.pl !== phrase.pl);
  const wrong: string[] = [];
  for (const p of pool) {
    if (wrong.length === 3) break;
    if (!wrong.includes(p.pl)) wrong.push(p.pl);
  }
  return shuffle(
    [{ text: phrase.pl, correct: true }, ...wrong.map((text) => ({ text, correct: false }))],
    rng,
  );
}

export function buildPhraseExercise(
  kind: PhraseExerciseKind,
  phrase: Phrase,
  scenes: readonly Scene[],
  rng: Rng,
): PhraseExercise {
  switch (kind) {
    case "read":
      return { kind, phrase };
    case "speak":
      return { kind, phrase };
    case "dictation":
      return { kind, phrase };
    case "listen":
      return { kind, phrase, choices: meaningChoices(phrase, scenes, rng) };
    case "order":
      return { kind, phrase, tiles: scrambled(tilesOf(phrase.it), rng) };
  }
}

/**
 * Ile znaków wolno pomylić w dyktandzie. Przy zdaniu jedna literówka na
 * kilkanaście znaków to wciąż „prawie", a nie błąd — inaczej jedna zgubiona
 * litera w długim zdaniu kasowałaby cały postęp.
 */
export const dictationTolerance = (expected: string): number =>
  Math.max(1, Math.floor(normalise(expected).length / 12));

export function judgeDictation(guess: string, expected: string): TypedOutcome {
  const typed = normalise(guess);
  const target = normalise(expected);
  if (typed === "") return "wrong";
  if (typed === target) return "exact";
  return editDistance(typed, target) <= dictationTolerance(expected) ? "typo" : "wrong";
}

export const orderIsRight = (placed: readonly string[], expected: string): boolean =>
  normalise(placed.join(" ")) === normalise(expected);

const passFail = (correct: boolean, weight: number): PhraseGraded => ({
  grade: correct ? "good" : "again",
  weight,
  correct,
  typed: null,
});

/**
 * Ocena odpowiedzi. Zwraca `null`, gdy sposób odpowiedzi nie pasuje do formy —
 * na przykład klocki podane do dyktanda. To błąd programu, nie użytkownika,
 * więc lepiej nie zapisać nic, niż zapisać coś bez sensu.
 */
export function gradePhrase(exercise: PhraseExercise, answer: PhraseAnswer): PhraseGraded | null {
  const weight = PHRASE_EVIDENCE[exercise.kind];
  switch (exercise.kind) {
    case "read":
    case "speak":
      if (answer.via !== "self") return null;
      return { grade: answer.grade, weight, correct: answer.grade !== "again", typed: null };
    case "listen":
      if (answer.via !== "choice") return null;
      return passFail(answer.correct, weight);
    case "order":
      if (answer.via !== "order") return null;
      return passFail(orderIsRight(answer.placed, exercise.phrase.it), weight);
    case "dictation": {
      if (answer.via !== "typed") return null;
      const typed = judgeDictation(answer.text, exercise.phrase.it);
      // Literówka jak przy słowach: zalicza, ale nie przyspiesza.
      const grade: Grade = typed === "wrong" ? "again" : "good";
      return { grade, weight: typed === "exact" ? weight : 1, correct: typed !== "wrong", typed };
    }
  }
}
