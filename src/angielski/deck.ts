/** Talia fiszek i dobór odpowiedzi do gry — czyste funkcje, bez stanu. */

import { shuffle, type Rng } from "../domain/random.js";
import type { Card } from "./words.js";

/** „Jeszcze raz" wraca po tylu kartach — na tyle późno, żeby nie pamiętać odpowiedzi z ekranu. */
export const AGAIN_GAP = 3;

/** Bieżąca karta (pierwsza) trafia z powrotem do talii, `gap` miejsc dalej. */
export function again<T>(queue: readonly T[], gap = AGAIN_GAP): T[] {
  const [first, ...rest] = queue;
  if (first === undefined) return [];
  const at = Math.min(gap, rest.length);
  return [...rest.slice(0, at), first, ...rest.slice(at)];
}

/**
 * Cztery odpowiedzi do wyboru: dobra i trzy z tego samego działu, żeby na
 * pytanie o ubranie nie odpowiadało się „How old are you?".
 */
export function options(card: Card, pool: readonly Card[], rng: Rng, n = 4): Card[] {
  const others = (list: readonly Card[]) => list.filter((c) => c.en !== card.en);
  const same = shuffle(others(pool.filter((c) => c.section === card.section)), rng);
  const rest = shuffle(others(pool.filter((c) => c.section !== card.section)), rng);
  return shuffle([card, ...[...same, ...rest].slice(0, n - 1)], rng);
}

/** Runda gry: tyle kart, ile się da, ale nie więcej niż `size`. */
export const gameRound = (pool: readonly Card[], rng: Rng, size = 10): Card[] =>
  shuffle(pool, rng).slice(0, size);

/** Gwiazdki za grę: trzy za prawie bezbłędnie, jedna za połowę. */
export function starsFor(right: number, total: number): 0 | 1 | 2 | 3 {
  if (total === 0) return 0;
  const share = right / total;
  return share >= 0.9 ? 3 : share >= 0.7 ? 2 : share >= 0.5 ? 1 : 0;
}
