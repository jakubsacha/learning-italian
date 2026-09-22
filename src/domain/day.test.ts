import { describe, expect, it } from "vitest";
import { asDateKey } from "./types";
import { dateKeyOf, dayNumberOf, shiftKey, streakLength } from "./day";

const at = (iso: string): Date => new Date(iso);

describe("dni", () => {
  it("numeruje dni tak, że kolejne różnią się o jeden", () => {
    const monday = dayNumberOf(at("2026-09-21T10:00:00Z"));
    const tuesday = dayNumberOf(at("2026-09-22T10:00:00Z"));
    expect(tuesday - monday).toBe(1);
  });

  it("ten sam dzień rano i wieczorem ma ten sam numer", () => {
    expect(dayNumberOf(at("2026-09-21T06:00:00Z"))).toBe(dayNumberOf(at("2026-09-21T21:00:00Z")));
  });

  it("klucz dnia jest w formacie RRRR-MM-DD", () => {
    expect(dateKeyOf(at("2026-09-21T10:00:00Z"))).toBe("2026-09-21");
  });

  it("przesunięcie w tył cofa o dobę", () => {
    expect(shiftKey(at("2026-09-21T10:00:00Z"), -1)).toBe("2026-09-20");
  });
});

describe("seria dni", () => {
  const now = at("2026-09-21T10:00:00Z");
  const counts = (entries: [string, number][]) =>
    new Map(entries.map(([k, v]) => [asDateKey(k), v]));

  it("liczy kolejne dni wstecz", () => {
    const map = counts([["2026-09-21", 5], ["2026-09-20", 3], ["2026-09-19", 1]]);
    expect(streakLength(map, now)).toBe(3);
  });

  it("przerwa kończy serię", () => {
    const map = counts([["2026-09-21", 5], ["2026-09-19", 1]]);
    expect(streakLength(map, now)).toBe(1);
  });

  it("brak wyniku dzisiaj nie łamie wczorajszej serii", () => {
    const map = counts([["2026-09-20", 3], ["2026-09-19", 1]]);
    expect(streakLength(map, now)).toBe(2);
  });

  it("pusta historia to zero", () => {
    expect(streakLength(counts([]), now)).toBe(0);
  });

  it("wspólny cel liczy serię po progu, nie po samej obecności", () => {
    const map = counts([["2026-09-21", 45], ["2026-09-20", 12], ["2026-09-19", 50]]);
    expect(streakLength(map, now, (c) => c >= 40)).toBe(1);
  });
});
