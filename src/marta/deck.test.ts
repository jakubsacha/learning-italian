import { describe, expect, it } from "vitest";
import { DECK, canType, sentencesFor } from "./deck";
import { splitGap } from "../domain/text";

describe("materiał Marty", () => {
  it("wczytuje słówka, zdania i kategorie", () => {
    expect(DECK.words.length).toBeGreaterThan(60);
    expect(DECK.sentences.length).toBeGreaterThan(20);
    expect(DECK.categories).toContain("Rodzina");
    expect(DECK.categories).toContain("Czasownik be");
  });

  it("żadne hasło ani kolejność się nie powtarza", () => {
    expect(new Set(DECK.words.map((w) => w.id)).size).toBe(DECK.words.length);
    const orders = DECK.words.map((w) => w.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("każde hasło ma tłumaczenie, wymowę i kategorię z listy", () => {
    const known = new Set(DECK.categories);
    for (const word of DECK.words) {
      expect(word.pl.length, word.it).toBeGreaterThan(0);
      expect(word.pr.length, word.it).toBeGreaterThan(0);
      expect(known.has(word.category), word.it).toBe(true);
    }
  });

  it("trzy formy „be” są w słowniku, bo to na nich stoją zdania", () => {
    const ids = new Set(DECK.words.map((w) => w.id));
    for (const form of ["am", "is", "are"]) expect(ids.has(form as never), form).toBe(true);
  });

  /**
   * Luka jest wyszukiwana zwykłym `indexOf`, więc gap „is” w zdaniu
   * „This is my family.” trafiłby w środek słowa „This”. Ten test pilnuje,
   * żeby takie zdanie nie weszło do materiału.
   */
  it("każda luka stoi jako osobne słowo, a nie w środku innego", () => {
    for (const sentence of DECK.sentences) {
      const low = sentence.it.toLowerCase();
      const at = low.indexOf(sentence.gap.toLowerCase());
      expect(at, sentence.it).toBeGreaterThanOrEqual(0);
      const before = at === 0 ? " " : low[at - 1]!;
      const after = low[at + sentence.gap.length] ?? " ";
      expect(/[a-z]/.test(before), sentence.it + " ← " + sentence.gap).toBe(false);
      expect(/[a-z]/.test(after), sentence.it + " → " + sentence.gap).toBe(false);
    }
  });

  it("luka odtwarza zdanie po złożeniu z powrotem", () => {
    for (const sentence of DECK.sentences) {
      const split = splitGap(sentence.it, sentence.gap);
      expect((split.before + sentence.gap + split.after).toLowerCase()).toBe(
        sentence.it.toLowerCase(),
      );
    }
  });

  it("każda luka wskazuje na hasło, które jest w słowniku", () => {
    const ids = new Set(DECK.words.map((w) => w.id.toLowerCase()));
    for (const sentence of DECK.sentences) {
      expect(ids.has(sentence.gap.toLowerCase()), sentence.gap).toBe(true);
    }
  });

  it("formy „be” mają po kilka zdań do ćwiczenia", () => {
    for (const form of ["am", "is", "are"]) {
      const word = DECK.words.find((w) => w.it === form)!;
      expect(sentencesFor(word).length, form).toBeGreaterThan(1);
    }
  });

  it("do wpisania idą tylko krótkie, jednowyrazowe hasła", () => {
    expect(canType(DECK.words.find((w) => w.it === "sister")!)).toBe(true);
    expect(canType(DECK.words.find((w) => w.it === "What is your name?")!)).toBe(false);
    expect(canType(DECK.words.find((w) => w.it === "they are")!)).toBe(false);
    expect(canType(DECK.words.find((w) => w.it === "grandparents")!)).toBe(false);
  });

  it("nauka zaczyna się od form „be” i najbliższej rodziny", () => {
    const first = DECK.words.slice().sort((a, b) => a.order - b.order).slice(0, 12);
    expect(first.map((w) => w.it)).toContain("am");
    expect(first.map((w) => w.it)).toContain("I am");
    expect(first.every((w) => w.level === 1)).toBe(true);
  });
});
