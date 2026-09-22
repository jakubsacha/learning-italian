import { describe, expect, it } from "vitest";
import { DECK, sentencesFor, sentencesUpTo } from "./deck";
import { splitGap } from "../domain/text";

describe("materiał kursu", () => {
  it("wczytuje cały słownik i wszystkie zdania", () => {
    expect(DECK.words.length).toBeGreaterThan(1900);
    expect(DECK.sentences.length).toBeGreaterThan(180);
    expect(DECK.categories.length).toBeGreaterThan(40);
  });

  it("żadne słowo nie powtarza się dwa razy", () => {
    expect(new Set(DECK.words.map((w) => w.id)).size).toBe(DECK.words.length);
  });

  it("każde słowo ma polskie znaczenie, wymowę i kategorię z listy", () => {
    const known = new Set(DECK.categories);
    for (const word of DECK.words) {
      expect(word.pl.length, word.it).toBeGreaterThan(0);
      expect(word.pr.length, word.it).toBeGreaterThan(0);
      expect(known.has(word.category), word.it + " → " + word.category).toBe(true);
    }
  });

  it("kolejność wprowadzania jest unikalna, więc nauka jest powtarzalna", () => {
    const orders = DECK.words.map((w) => w.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("każde zdanie naprawdę zawiera swoją lukę", () => {
    for (const sentence of DECK.sentences) {
      const split = splitGap(sentence.it, sentence.gap);
      // Luka bywa zapisana małą literą, choć zdanie zaczyna się wielką —
      // dlatego szukamy jej bez oglądania się na wielkość liter.
      expect((split.before + sentence.gap + split.after).toLowerCase(), sentence.it)
        .toBe(sentence.it.toLowerCase());
      expect(split.before.length + split.after.length, sentence.it)
        .toBeLessThan(sentence.it.length);
    }
  });

  /**
   * Luka jest wyszukiwana zwykłym `indexOf`, więc gdyby jej litery trafiły się
   * wcześniej w innym wyrazie, zdanie rozpadłoby się w złym miejscu.
   */
  it("każda luka stoi jako osobne słowo, a nie w środku innego", () => {
    for (const sentence of DECK.sentences) {
      const low = sentence.it.toLowerCase();
      const at = low.indexOf(sentence.gap.toLowerCase());
      const before = at === 0 ? " " : low[at - 1]!;
      const after = low[at + sentence.gap.length] ?? " ";
      expect(/\p{L}/u.test(before), sentence.it + " ← " + sentence.gap).toBe(false);
      expect(/\p{L}/u.test(after), sentence.it + " → " + sentence.gap).toBe(false);
    }
  });

  it("zdania dopasowują się do słów z kursu", () => {
    const withSentence = DECK.words.filter((w) => sentencesFor(w).length > 0);
    expect(withSentence.length).toBeGreaterThan(80);
  });

  it("poziom pierwszy ma z czego budować zdania", () => {
    expect(sentencesUpTo(1).length).toBeGreaterThan(30);
    expect(sentencesUpTo(3).length).toBe(DECK.sentences.length);
  });
});
