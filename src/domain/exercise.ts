/**
 * Dobór formy pytania i złożenie ćwiczenia. Reguła: im lepiej znasz słowo, tym
 * trudniejsza forma. Słowo, na którym się wykładasz, wraca do łatwiejszych form
 * — inaczej utrwalasz samą porażkę.
 */

import type { Choice, Exercise, Progress, Sentence, Word } from "./types.js";
import { isLeech } from "./scheduler.js";
import { splitGap, acceptedForms } from "./text.js";
import { pick, shuffle, type Rng } from "./random.js";

/** Forma pytania bez danych — sam wybór, zanim złożymy ćwiczenie. */
export type Form =
  | { readonly kind: "card" }
  | { readonly kind: "choice"; readonly direction: "it-pl" | "pl-it" }
  | { readonly kind: "listen" }
  | { readonly kind: "type" }
  | { readonly kind: "cloze" };

/** Ile odpowiedzi ma test wyboru. */
export const CHOICE_COUNT = 4;
/** Poniżej tylu poznanych słów dystraktory bierzemy z najczęstszych, nie z losowych. */
const MIN_STUDIED = 8;
/** Ile najczęstszych słów podstawiamy na starcie. */
const STARTER_POOL = 40;

export type FormContext = {
  readonly word: Word;
  readonly progress: Progress;
  /** Zakładka "Fiszki": wyłącznie karty. */
  readonly cardsOnly: boolean;
  /** Czy da się odtworzyć wymowę — bez głosu nie ma ćwiczenia ze słuchu. */
  readonly canListen: boolean;
  readonly sentences: readonly Sentence[];
};

export function chooseForm(ctx: FormContext, rng: Rng): Form {
  const review = ctx.progress.get(ctx.word.id);
  // W trybie Fiszki i dla słów dopiero poznawanych zawsze karta.
  if (ctx.cardsOnly || review === undefined || review.reps < 1) return { kind: "card" };

  if (isLeech(review)) {
    const easy: [Form, ...Form[]] = ctx.canListen
      ? [{ kind: "card" }, { kind: "choice", direction: "it-pl" }, { kind: "listen" }]
      : [{ kind: "card" }, { kind: "choice", direction: "it-pl" }];
    return pick(easy, rng);
  }

  const forms: [Form, ...Form[]] = [{ kind: "card" }, { kind: "choice", direction: "it-pl" }];
  if (ctx.canListen) forms.push({ kind: "listen" });
  if (review.reps >= 2) forms.push({ kind: "choice", direction: "pl-it" });
  // Produkcja bije rozpoznawanie, więc trafia na listę dwa razy.
  if (review.reps >= 3) forms.push({ kind: "type" }, { kind: "type" });
  if (review.reps >= 3 && ctx.sentences.length > 0) forms.push({ kind: "cloze" }, { kind: "cloze" });
  return pick(forms, rng);
}

/** Pula, z której bierzemy błędne odpowiedzi. */
export function distractorPool(pool: readonly Word[], progress: Progress): readonly Word[] {
  const seen = pool.filter((w) => progress.has(w.id));
  if (seen.length >= MIN_STUDIED) return seen;
  // Na starcie: najczęstsze słowa, a nie losowe z całego słownika.
  return pool.slice().sort((a, b) => a.order - b.order).slice(0, STARTER_POOL);
}

const choicesFrom = (
  correct: string,
  wrong: readonly string[],
  rng: Rng,
): readonly Choice[] =>
  shuffle(
    [{ text: correct, correct: true }, ...wrong.map((text) => ({ text, correct: false }))],
    rng,
  );

export type BuildContext = {
  readonly word: Word;
  readonly progress: Progress;
  readonly pool: readonly Word[];
  readonly sentences: readonly Sentence[];
};

/** Składa ćwiczenie wybranej formy razem z danymi, których ta forma wymaga. */
export function buildExercise(form: Form, ctx: BuildContext, rng: Rng): Exercise {
  const review = ctx.progress.get(ctx.word.id) ?? null;
  const others = shuffle(
    distractorPool(ctx.pool, ctx.progress).filter((w) => w.id !== ctx.word.id),
    rng,
  ).slice(0, CHOICE_COUNT - 1);

  switch (form.kind) {
    case "card":
      return { kind: "card", word: ctx.word, review };
    case "choice": {
      const key = form.direction === "pl-it" ? "it" : "pl";
      return {
        kind: "choice",
        word: ctx.word,
        direction: form.direction,
        choices: choicesFrom(ctx.word[key], others.map((w) => w[key]), rng),
      };
    }
    case "listen":
      return {
        kind: "listen",
        word: ctx.word,
        choices: choicesFrom(ctx.word.pl, others.map((w) => w.pl), rng),
      };
    case "type":
      return { kind: "type", word: ctx.word, accepted: acceptedForms(ctx.word.it) };
    case "cloze": {
      const first = ctx.sentences[0];
      // Bez zdania nie ma luki; wracamy do karty zamiast składać pusty ekran.
      if (first === undefined) return { kind: "card", word: ctx.word, review };
      const sentence = pick([first, ...ctx.sentences.slice(1)], rng);
      return {
        kind: "cloze",
        word: ctx.word,
        sentence,
        split: splitGap(sentence.it, sentence.gap),
        choices: choicesFrom(sentence.gap, others.map((w) => w.it), rng),
      };
    }
  }
}
