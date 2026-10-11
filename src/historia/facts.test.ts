import { describe, expect, it } from "vitest";
import { FACTS, inScope } from "./facts";
import { choicesFor, isDated } from "../domain/facts/session";
import { firstRng } from "../domain/fixtures";

describe("materiał z historii", () => {
  it("ma trzy części: dwa tematy z podręcznika i wkładkę", () => {
    expect(inScope(1).length).toBeGreaterThan(50);
    expect(inScope(2).length).toBeGreaterThan(50);
    expect(inScope(3).length).toBeGreaterThan(10);
    expect(inScope("all")).toHaveLength(FACTS.length);
  });

  it("każde pytanie występuje raz — jest swoim kluczem w zapisie", () => {
    expect(new Set(FACTS.map((f) => f.id)).size).toBe(FACTS.length);
  });

  it("pogrubione fakty są w obu tematach podręcznika, a wkładka to same ciekawostki", () => {
    expect(inScope(1).filter((f) => f.key).length).toBeGreaterThan(25);
    expect(inScope(2).filter((f) => f.key).length).toBeGreaterThan(25);
    expect(inScope(3).some((f) => f.key)).toBe(false);
  });

  it("każdy fakt da się zamienić w test ABCD", () => {
    for (const f of FACTS) expect(choicesFor(f, FACTS, firstRng), f.q).toHaveLength(4);
  });

  it("na osi czasu są wydarzenia z różnych dni", () => {
    const dated = FACTS.filter(isDated);
    expect(dated.length).toBeGreaterThan(15);
    expect(new Set(dated.map((f) => f.event.when)).size).toBe(dated.length);
  });

  it("data z samym miesiącem w książce ma w zapisie dzień 00", () => {
    // „w czerwcu 1940 r." nie może udawać konkretnego dnia na osi czasu
    for (const f of FACTS.filter(isDated)) {
      const monthOnly = /^(w|od) [a-ząćęłńóśźż]+( do [a-ząćęłńóśźż]+)? 19\d\d/.test(f.a);
      expect(f.event.when % 100 === 0, f.a).toBe(monthOnly);
    }
  });

  it("wybuch wojny to 1 września 1939 r. i jest wśród najważniejszych", () => {
    const f = FACTS.find((x) => x.q === "Kiedy wybuchła II wojna światowa?");
    expect(f).toMatchObject({ a: "1 września 1939 r.", key: true, kind: "data" });
  });

  it("każde pytanie ma odpowiedź i stronę z książki", () => {
    for (const f of FACTS) {
      expect(f.a.length, f.q).toBeGreaterThan(0);
      expect(f.page, f.q).not.toBeNull();
    }
  });
});
