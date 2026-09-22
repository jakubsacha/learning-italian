import type { GapSplit } from "./types";

/**
 * Dzieli zdanie na część przed i po luce.
 * Granica słowa `\b` w JavaScripcie nie działa po literach z akcentem — dla
 * „città." nie ma granicy między „à" a kropką — więc szukamy wprost.
 */
export function splitGap(sentence: string, gap: string): GapSplit {
  const at = sentence.toLowerCase().indexOf(gap.toLowerCase());
  if (at < 0) return { before: sentence, after: "" };
  return { before: sentence.slice(0, at), after: sentence.slice(at + gap.length) };
}

const deaccent = (text: string): string =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Postać do porównania odpowiedzi: bez akcentów, wielkości liter i interpunkcji. */
export const normalise = (text: string): string =>
  deaccent(text.toLowerCase().trim())
    .replace(/[.,!?¿¡]/g, "")
    .replace(/\s+/g, " ");

/**
 * Formy uznawane za poprawne przy wpisywaniu.
 * „scusi / scusa" to dwie osobne odpowiedzi, a „piacere (mi piace)" przyjmujemy
 * z nawiasem i bez — wpisywanie ma sprawdzać słowo, nie umiejętność cytowania.
 */
export function acceptedForms(italian: string): readonly string[] {
  const forms = new Set<string>();
  for (const part of italian.split("/")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    forms.add(trimmed);
    forms.add(trimmed.replace(/\s*\(.*?\)\s*/g, " ").trim());
    const inner = /\((.*?)\)/.exec(trimmed);
    if (inner?.[1]) forms.add(inner[1].trim());
  }
  return [...forms].filter((f) => f.length > 0);
}

/** Odległość edycyjna Levenshteina — na tyle, żeby odróżnić literówkę od błędu. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i, ...Array<number>(b.length).fill(0)];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length]!;
}

/** Ile znaków wolno pomylić, zanim odpowiedź przestaje być literówką. */
const typoTolerance = (guess: string): number => (guess.length > 6 ? 2 : 1);

export type TypedOutcome = "exact" | "typo" | "wrong";

export function judgeTyped(guess: string, accepted: readonly string[]): TypedOutcome {
  const typed = normalise(guess);
  if (!typed) return "wrong";
  const forms = accepted.map(normalise);
  if (forms.includes(typed)) return "exact";
  const tolerance = typoTolerance(typed);
  return forms.some((f) => editDistance(f, typed) <= tolerance) ? "typo" : "wrong";
}

/** Polska odmiana przez liczbę: 1 karta, 2 karty, 5 kart. */
export function plural(count: number, one: string, few: string, many: string): string {
  const units = count % 10;
  const tens = count % 100;
  if (count === 1) return one;
  if (units >= 2 && units <= 4 && (tens < 12 || tens > 14)) return few;
  return many;
}

export const withCount = (count: number, one: string, few: string, many: string): string =>
  `${count} ${plural(count, one, few, many)}`;
