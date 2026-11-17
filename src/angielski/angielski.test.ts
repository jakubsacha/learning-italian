import { describe, expect, it } from "vitest";
import { CARDS, FURNITURE, SECTIONS, activeIn, cardsOf, inSections, roomSentence, sectionsOf } from "./words";
import { ART } from "./art";
import { again, gameRound, options, starsFor } from "./deck";
import { ALL, KEYS, readKnown, readSections, readStars, readUnit } from "./storage";
import { memoryStore } from "../storage/stores";
import { firstRng } from "../domain/fixtures";

describe("słówka z Unit 2", () => {
  it("cztery działy z niebieskich ramek, w liczbie jak w książce", () => {
    const count = (id: string) => CARDS.filter((c) => c.section === id).length;
    expect(sectionsOf(2).map((s) => s.lesson)).toEqual(["2.1", "2.2", "2.4", "2.5"]);
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

describe("Unit 3 — tylko pokoje i meble z zeszytu", () => {
  it("dokładnie te słówka, pogrupowane jak w zeszycie", () => {
    const words = (id: string) => CARDS.filter((c) => c.section === id).map((c) => c.en);
    expect(words("sypialnia")).toEqual(["bedroom", "bed", "desk", "chair", "wardrobe"]);
    expect(words("salon")).toEqual(["living room", "TV", "sofa", "armchair"]);
    expect(words("lazienka")).toEqual(["bathroom", "toilet", "bath", "shower"]);
    expect(cardsOf(3)).toHaveLength(13);
    expect(cardsOf(2)).toHaveLength(39);
  });

  it("każdy unit ma swoje działy; brak wyboru w unicie znaczy wszystkie jego działy", () => {
    expect(SECTIONS).toHaveLength(7);
    expect([...activeIn(3, new Set(["ubrania"] as const))]).toEqual(["sypialnia", "salon", "lazienka"]);
    expect([...activeIn(3, new Set(["ubrania", "salon"] as const))]).toEqual(["salon"]);
    expect([...activeIn(2, new Set(["salon"] as const))]).toEqual(["ubrania", "przymiotniki", "pytania", "rzeczy"]);
  });

  it("gra w pokoje: dziesięć mebli i zdanie z odpowiedzią", () => {
    expect(FURNITURE.map((c) => c.en)).toEqual(["bed", "desk", "chair", "wardrobe", "TV", "sofa", "armchair", "toilet", "bath", "shower"]);
    const tv = FURNITURE.find((c) => c.en === "TV");
    const bath = FURNITURE.find((c) => c.en === "bath");
    if (tv === undefined || bath === undefined) throw new Error("brak mebli");
    expect(roomSentence(tv)).toEqual({ en: "The TV is in the living room.", pl: "Telewizor jest w salonie." });
    expect(roomSentence(bath)).toEqual({ en: "The bath is in the bathroom.", pl: "Wanna jest w łazience." });
  });

  it("odpowiedzi w grze z Unitu 3 są z tego samego pokoju albo przynajmniej z Unitu 3", () => {
    for (const card of cardsOf(3)) {
      const opts = options(card, cardsOf(3), firstRng);
      expect(opts).toHaveLength(4);
      for (const o of opts) expect(cardsOf(3)).toContain(o);
    }
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

  it("unit: zapisany albo najnowszy", () => {
    const store = memoryStore();
    expect(readUnit(store)).toBe(3);
    store.write(KEYS.unit, 2);
    expect(readUnit(store)).toBe(2);
    store.write(KEYS.unit, 9);
    expect(readUnit(store)).toBe(3);
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
