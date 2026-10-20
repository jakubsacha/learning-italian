import { describe, expect, it } from "vitest";
import { CARDS, SECTIONS, inSections } from "./words";
import { ART } from "./art";
import { again, gameRound, options, starsFor } from "./deck";
import { ALL, KEYS, readKnown, readSections, readStars } from "./storage";
import { memoryStore } from "../storage/stores";
import { firstRng } from "../domain/fixtures";

describe("słówka z Unit 2", () => {
  it("cztery działy z niebieskich ramek, w liczbie jak w książce", () => {
    const count = (id: string) => CARDS.filter((c) => c.section === id).length;
    expect(SECTIONS.map((s) => s.lesson)).toEqual(["2.1", "2.2", "2.4", "2.5"]);
    expect([count("ubrania"), count("przymiotniki"), count("pytania"), count("rzeczy")]).toEqual([16, 8, 9, 6]);
  });

  it("każde słówko jest raz i ma obrazek, który istnieje", () => {
    expect(new Set(CARDS.map((c) => c.en)).size).toBe(CARDS.length);
    for (const c of CARDS) {
      if ("draw" in c.art) expect(ART[c.art.draw], c.en).toBeDefined();
      else expect(c.art.emoji.length, c.en).toBeGreaterThan(0);
    }
  });

  it("filtr zostawia tylko wybrane działy", () => {
    const only = inSections(CARDS, new Set(["rzeczy"] as const));
    expect(only.map((c) => c.en)).toEqual(["backpack", "headphones", "keys", "mountain bike", "smartphone", "tablet"]);
  });
});

describe("talia i gra", () => {
  it("„jeszcze raz” odkłada kartę trzy miejsca dalej, a przy końcu talii — na koniec", () => {
    expect(again(["a", "b", "c", "d", "e"])).toEqual(["b", "c", "d", "a", "e"]);
    expect(again(["a", "b"])).toEqual(["b", "a"]);
    expect(again(["a"])).toEqual(["a"]);
    expect(again([])).toEqual([]);
  });

  it("odpowiedzi w grze: cztery różne, w tym dobra, z tego samego działu", () => {
    for (const card of CARDS) {
      const opts = options(card, CARDS, firstRng);
      expect(opts).toHaveLength(4);
      expect(opts).toContain(card);
      expect(new Set(opts.map((o) => o.en)).size).toBe(4);
      for (const o of opts) expect(o.section, card.en).toBe(card.section);
    }
  });

  it("gdy w dziale jest mało słówek, dobiera z innych", () => {
    const things = inSections(CARDS, new Set(["rzeczy"] as const));
    const card = things[0];
    if (card === undefined) throw new Error("brak kart");
    expect(options(card, things.slice(0, 2), firstRng)).toHaveLength(2);
  });

  it("runda ma najwyżej 10 pytań, bez powtórek", () => {
    const round = gameRound(CARDS, firstRng);
    expect(round).toHaveLength(10);
    expect(new Set(round).size).toBe(10);
    expect(gameRound(CARDS.slice(0, 3), firstRng)).toHaveLength(3);
  });

  it("gwiazdki za wynik gry", () => {
    expect([starsFor(10, 10), starsFor(9, 10), starsFor(7, 10), starsFor(5, 10), starsFor(4, 10), starsFor(0, 0)]).toEqual([
      3, 3, 2, 1, 0, 0,
    ]);
  });
});

describe("zapis", () => {
  it("odczyt bierze to, co zapisane, a śmieci pomija", () => {
    const store = memoryStore();
    store.write(KEYS.sections, ["rzeczy", "bzdura"]);
    store.write(KEYS.known, ["keys", 7, "nie-ma-takiego"]);
    store.write(KEYS.stars, 12);
    expect([...readSections(store)]).toEqual(["rzeczy"]);
    expect([...readKnown(store)]).toEqual(["keys"]);
    expect(readStars(store)).toBe(12);
  });

  it("bez zapisu — wszystkie działy, nic nie umiane, zero gwiazdek", () => {
    const store = memoryStore();
    store.write(KEYS.sections, []);
    store.write(KEYS.stars, -5);
    expect(readSections(store)).toBe(ALL);
    expect(readKnown(store).size).toBe(0);
    expect(readStars(store)).toBe(0);
  });
});
