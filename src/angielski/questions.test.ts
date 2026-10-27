import { describe as group, expect, it } from "vitest";
import {
  ITEMS,
  SUSPECTS,
  TRAITS,
  answerChoices,
  built,
  describe,
  fits,
  guessStars,
  question,
  reply,
  sentenceOf,
  shortAnswer,
  statement,
  tiles,
} from "./questions";
import { firstRng } from "../domain/fixtures";

const find = (start: string) => {
  const item = ITEMS.find((i) => question(i).startsWith(start));
  if (item === undefined) throw new Error(start);
  return item;
};

group("pytania przez inwersję", () => {
  it("ćwiczenie 8: zdanie i pytanie z przestawionym czasownikiem", () => {
    const ten = find("Are you ten");
    expect(statement(ten)).toBe("You are ten years old.");
    expect(question(ten)).toBe("Are you ten years old?");
    expect(question(find("Are Superdug"))).toBe("Are Superdug and Kit cool?");
    expect(question(find("Am I a"))).toBe("Am I a superhero?");
    expect(question(find("Are your"))).toBe("Are your shoes new?");
    expect(statement(find("Are your"))).toBe("Your shoes are new.");
    expect(question(find("Is Don"))).toBe("Is Don a superhero?");
  });

  it("krótkie odpowiedzi jak w książce", () => {
    const ten = find("Are you ten");
    expect(shortAnswer(ten, true)).toBe("Yes, I am.");
    expect(shortAnswer(ten, false)).toBe("No, I'm not.");
    expect(shortAnswer(find("Am I a"), true)).toBe("Yes, you are.");
    expect(shortAnswer(find("Am I a"), false)).toBe("No, you aren't.");
    expect(shortAnswer(find("Are we"), true)).toBe("Yes, we are.");
    expect(shortAnswer(find("Are Superdug"), false)).toBe("No, they aren't.");
    expect(shortAnswer(find("Is he"), false)).toBe("No, he isn't.");
    expect(shortAnswer(find("Is this"), true)).toBe("Yes, it is.");
  });

  it("cztery różne odpowiedzi, w tym dobra i „tak” ze skrótem jako pułapka", () => {
    for (const item of ITEMS) {
      for (const yes of [true, false]) {
        const opts = answerChoices(item, yes, firstRng);
        expect(opts, question(item)).toHaveLength(4);
        expect(opts).toContain(shortAnswer(item, yes));
        expect(opts.some((o) => /^Yes, \w+'(m|s|re)\.$/.test(o))).toBe(true);
      }
    }
    expect(answerChoices(find("Are you ten"), true, firstRng).sort()).toEqual(
      ["No, I'm not.", "Yes, I am.", "Yes, I'm.", "Yes, you are."].sort(),
    );
  });

  it("klocki: czasownik, podmiot, reszta i zły czasownik; dobre tylko z czasownikiem na początku", () => {
    for (const item of ITEMS) {
      const t = tiles(item, firstRng);
      expect(t).toHaveLength(4);
      const by = (role: string) => t.find((x) => x.role === role);
      const verb = by("verb");
      const subject = by("subject");
      const rest = by("rest");
      if (verb === undefined || subject === undefined || rest === undefined) throw new Error("brak klocka");
      expect(by("decoy")?.text).not.toBe(item.verb);
      expect(built([verb, subject, rest])).toBe(true);
      expect(sentenceOf([verb, subject, rest])).toBe(question(item));
      expect(built([subject, verb, rest])).toBe(false);
    }
  });
});

group("kto to? — tabelka z ćwiczenia 9", () => {
  it("każdy jest inny, więc da się go odgadnąć", () => {
    const keys = SUSPECTS.map((s) => TRAITS.map((t) => (s.is.has(t.id) ? 1 : 0)).join(""));
    expect(new Set(keys).size).toBe(SUSPECTS.length);
  });

  it("przykład z książki opisuje Jima", () => {
    const who = SUSPECTS.filter((s) => !s.is.has("teenager") && !s.is.has("British")).map((s) => s.name);
    expect(who).toEqual(["Jim"]);
    const jim = SUSPECTS.find((s) => s.name === "Jim");
    if (jim === undefined) throw new Error("brak Jima");
    expect(describe(jim, "teenager", "British")).toBe("He isn't a teenager and he isn't British.");
    expect(reply(jim, "Polish")).toBe("Yes, he is.");
  });

  it("odpowiedzi odsiewają podejrzanych, a gwiazdki maleją z liczbą pytań", () => {
    const left = SUSPECTS.filter((s) => fits(s, [{ trait: "British", yes: true }])).map((s) => s.name);
    expect(left).toEqual(["Carl", "Mark"]);
    expect([guessStars(1, true), guessStars(2, true), guessStars(3, true), guessStars(4, true), guessStars(1, false)]).toEqual([
      3, 3, 2, 1, 0,
    ]);
  });
});
