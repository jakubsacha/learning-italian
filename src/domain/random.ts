/**
 * Losowość podana z zewnątrz. Dzięki temu dobór ćwiczeń i tasowanie kolejki
 * da się przetestować: w testach wstrzykujemy ciąg liczb zamiast `Math.random`.
 */

export type Rng = () => number;

export const systemRng: Rng = () => Math.random();

/** Kopia listy w losowej kolejności — oryginał zostaje nietknięty. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    /* noUncheckedIndexedAccess wymaga sprawdzenia; oba indeksy są w zakresie. */
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** Losowy element niepustej listy. Typ wymusza niepustość — nie ma `undefined`. */
export function pick<T>(items: readonly [T, ...T[]], rng: Rng): T {
  const i = Math.floor(rng() * items.length);
  return items[i] ?? items[0];
}
