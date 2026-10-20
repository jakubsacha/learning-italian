/**
 * Lata i wieki. Roku zerowego nie ma: po 1 r. p.n.e. od razu jest 1 r. n.e.,
 * więc I wiek to lata 1–100, a I wiek p.n.e. — lata 100–1 p.n.e.
 */

import { shuffle, type Rng } from "../domain/random.js";

export type Era = "ne" | "pne";

/** Rok jako liczba dodatnia i era — nigdy zero. */
export type Year = { readonly value: number; readonly era: Era };

export type Century = { readonly n: number; readonly era: Era };

export const NE_MAX = 2025;
export const PNE_MAX = 3000;

export function centuryOf(year: Year): Century {
  return { n: Math.ceil(year.value / 100), era: year.era };
}

const ROMAN: readonly (readonly [number, string])[] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function roman(n: number): string {
  let rest = n;
  let out = "";
  for (const [value, sign] of ROMAN) {
    while (rest >= value) {
      out += sign;
      rest -= value;
    }
  }
  return out;
}

const eraSuffix = (era: Era): string => (era === "pne" ? " p.n.e." : "");

export const yearLabel = (y: Year): string => `${y.value} r.${eraSuffix(y.era)}`;

export const centuryLabel = (c: Century): string =>
  `${roman(c.n)} w.${c.era === "pne" ? " p.n.e." : " n.e."}`;

export const sameCentury = (a: Century, b: Century): boolean => a.n === b.n && a.era === b.era;

/** Lata wieku w kolejności czytania: n.e. rosnąco, p.n.e. malejąco (od 800 do 701). */
export function span(c: Century): string {
  const first = (c.n - 1) * 100 + 1;
  const last = c.n * 100;
  return c.era === "ne" ? `${first}–${last}` : `${last}–${first} p.n.e.`;
}

/** Wyjaśnienie krok po kroku, tak jak liczy się w szkole. */
export function explain(year: Year): string {
  const c = centuryOf(year);
  const where = `${roman(c.n)} wiek${eraSuffix(c.era)} (lata ${span(c)})`;
  const hundreds = Math.floor(year.value / 100);
  if (year.value % 100 === 0) {
    return `${year.value} kończy się na 00, więc nic nie dodajesz: ${hundreds} → ${where}.`;
  }
  return `Zakryj dwie ostatnie cyfry i dodaj 1: ${hundreds} + 1 = ${c.n} → ${where}.`;
}

/** Czy taki wiek w ogóle bywa w grze — do odrzucania głupich odpowiedzi. */
const possible = (c: Century): boolean =>
  c.n >= 1 && c.n <= Math.ceil((c.era === "ne" ? NE_MAX : PNE_MAX) / 100);

/**
 * Cztery odpowiedzi. Złe to typowe pomyłki: wiek obok (zapomniane „+1"
 * albo dodane przy pełnej setce) i — gdy gra obejmuje obie ery — ta sama
 * liczba w drugiej erze.
 */
export function choices(year: Year, bothEras: boolean, rng: Rng): Century[] {
  const right = centuryOf(year);
  const other: Era = right.era === "ne" ? "pne" : "ne";
  const near = [-1, 1, 2, -2, 3, -3, 4].map((d) => ({ n: right.n + d, era: right.era }));
  const wrong = bothEras
    ? [near[0], { n: right.n, era: other }, near[1], { n: right.n - 1, era: other }, ...near.slice(2)]
    : near;
  const picked: Century[] = [right];
  for (const c of wrong) {
    if (c === undefined || !possible(c) || picked.some((p) => sameCentury(p, c))) continue;
    picked.push(c);
    if (picked.length === 4) break;
  }
  return shuffle(picked, rng);
}

/** Daty z historii — żeby rok coś znaczył. */
export const FAMOUS: readonly (Year & { readonly what: string })[] = [
  { value: 776, era: "pne", what: "pierwsze igrzyska olimpijskie" },
  { value: 753, era: "pne", what: "według legendy założenie Rzymu" },
  { value: 44, era: "pne", what: "śmierć Juliusza Cezara" },
  { value: 476, era: "ne", what: "upadek cesarstwa zachodniorzymskiego" },
  { value: 966, era: "ne", what: "chrzest Polski" },
  { value: 1000, era: "ne", what: "zjazd gnieźnieński" },
  { value: 1025, era: "ne", what: "koronacja Bolesława Chrobrego" },
  { value: 1410, era: "ne", what: "bitwa pod Grunwaldem" },
  { value: 1492, era: "ne", what: "Kolumb dopływa do Ameryki" },
  { value: 1569, era: "ne", what: "unia lubelska" },
  { value: 1683, era: "ne", what: "odsiecz wiedeńska" },
  { value: 1791, era: "ne", what: "Konstytucja 3 maja" },
  { value: 1795, era: "ne", what: "III rozbiór Polski" },
  { value: 1918, era: "ne", what: "Polska odzyskuje niepodległość" },
  { value: 1939, era: "ne", what: "wybuch II wojny światowej" },
  { value: 1944, era: "ne", what: "powstanie warszawskie" },
  { value: 1989, era: "ne", what: "wybory czerwcowe" },
];

export type Question = Year & { readonly what?: string };

/**
 * Losowy rok. Co piąty to pułapka (pełna setka albo rok tuż po niej), a przy
 * słynnych datach co czwarty pochodzi z historii.
 */
export function randomYear(rng: Rng, bothEras: boolean, famous: boolean): Question {
  const era: Era = bothEras && rng() < 0.4 ? "pne" : "ne";
  const max = era === "ne" ? NE_MAX : PNE_MAX;
  const roll = rng();
  if (famous && roll < 0.25) {
    const pool = FAMOUS.filter((f) => bothEras || f.era === "ne");
    const f = pool[Math.floor(rng() * pool.length)];
    if (f !== undefined) return f;
  }
  if (roll < 0.45) {
    const hundred = 1 + Math.floor(rng() * Math.floor(max / 100));
    const value = hundred * 100 + (rng() < 0.5 ? 0 : 1);
    return { value: Math.min(value, max), era };
  }
  return { value: 1 + Math.floor(rng() * max), era };
}

/** Wiek tuż przed danym w czasie: przed I w. n.e. jest I w. p.n.e. */
export function before(c: Century): Century {
  if (c.era === "pne") return { n: c.n + 1, era: "pne" };
  return c.n === 1 ? { n: 1, era: "pne" } : { n: c.n - 1, era: "ne" };
}

/** Wiek tuż po danym w czasie: po I w. p.n.e. jest I w. n.e. */
export function after(c: Century): Century {
  if (c.era === "ne") return { n: c.n + 1, era: "ne" };
  return c.n === 1 ? { n: 1, era: "ne" } : { n: c.n - 1, era: "pne" };
}
