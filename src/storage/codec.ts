/**
 * Dekodery granicy. Wszystko, co przychodzi z `localStorage` albo z sieci, to
 * `unknown` — nie `any`. Zanim trafi do domeny, musi przejść przez te funkcje.
 * Dane z poprzedniej wersji aplikacji bywają niepełne albo uszkodzone i wtedy
 * ma zostać pominięty jeden wpis, a nie wywrócić się cała aplikacja.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Skończona liczba albo `null`. Odrzuca NaN i nieskończoności. */
export const asFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const asNonNegativeInt = (value: unknown): number | null => {
  const n = asFiniteNumber(value);
  return n === null || n < 0 ? null : Math.floor(n);
};

export const asText = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export const asBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

export const asTextList = (value: unknown): readonly string[] | null =>
  Array.isArray(value) && value.every((x) => typeof x === "string")
    ? (value as readonly string[])
    : null;

/** Liczba wzięta w widełki; spoza zakresu wraca wartość domyślna. */
export const asBounded = (value: unknown, min: number, max: number): number | null => {
  const n = asFiniteNumber(value);
  return n === null || n < min || n > max ? null : n;
};

/** Jedna z dozwolonych wartości — inaczej `null`. */
export const asOneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null => (typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null);

/** Parsuje JSON, nigdy nie rzuca. Uszkodzony wpis jest jak brak wpisu. */
export function parseJson(raw: string | null): unknown {
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}
