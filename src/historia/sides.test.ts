import { describe, expect, it } from "vitest";
import { COUNTRIES, SIDES } from "./sides";

describe("kto z kim", () => {
  it("każda grupa ma kilka państw do przypisania", () => {
    for (const side of SIDES) {
      expect(COUNTRIES.filter((c) => c.side === side).length, side).toBeGreaterThanOrEqual(5);
    }
  });

  it("każde państwo występuje raz i ma uzasadnienie ze strony książki", () => {
    expect(new Set(COUNTRIES.map((c) => c.name)).size).toBe(COUNTRIES.length);
    for (const c of COUNTRIES) {
      expect(c.why.length, c.name).toBeGreaterThan(10);
      expect(c.page, c.name).toBeGreaterThanOrEqual(8);
      expect(c.page, c.name).toBeLessThanOrEqual(21);
    }
  });

  it("sojusznicy III Rzeszy z podsumowania tematu są po stronie Osi", () => {
    for (const name of ["Węgry", "Rumunia", "Bułgaria"]) {
      expect(COUNTRIES.find((c) => c.name === name)?.side, name).toBe("os");
    }
  });

  it("ZSRS nie jest pytaniem — nie pasuje do żadnej grupy", () => {
    expect(COUNTRIES.some((c) => c.name.includes("ZSRS"))).toBe(false);
  });
});
