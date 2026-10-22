import { describe, expect, it } from "vitest";
import { POINTERS, SENTENCES, answerOf, blank, fill, pointRound, pointer, why } from "./pointing";
import { firstRng } from "../domain/fixtures";

describe("this, that, these, those", () => {
  it("reguła z zeszytu: liczba i odległość", () => {
    expect(pointer(false, false)).toBe("this");
    expect(pointer(false, true)).toBe("that");
    expect(pointer(true, false)).toBe("these");
    expect(pointer(true, true)).toBe("those");
  });

  it("zgoda z czasownikiem: is przy jednej rzeczy, are przy wielu", () => {
    for (const s of SENTENCES) {
      if (/\bis\b/.test(s.en)) expect(s.many, s.en).toBe(false);
      if (/\bare\b|^Are\b/.test(s.en)) expect(s.many, s.en).toBe(true);
    }
  });

  it("każde zdanie ma jedną lukę i oba tłumaczenia", () => {
    for (const s of SENTENCES) {
      expect(s.en.split("___").length, s.en).toBe(2);
      expect(s.near).not.toBe(s.far);
    }
  });

  it("wstawianie: wielka litera na początku, mała w środku", () => {
    const cats = SENTENCES.find((s) => s.en.includes("cats"));
    const glasses = SENTENCES.find((s) => s.en.includes("glasses"));
    if (cats === undefined || glasses === undefined) throw new Error("brak zdań");
    expect(fill(cats, "these")).toBe("These are my cats.");
    expect(fill(glasses, "those")).toBe("Are those my reading glasses?");
    expect(blank(cats)).toBe("_____ are my cats.");
  });

  it("runda: dziesięć różnych zdań, blisko i daleko po równo", () => {
    const round = pointRound(firstRng);
    expect(round).toHaveLength(10);
    expect(new Set(round.map((q) => q.sentence.en)).size).toBe(10);
    expect(round.filter((q) => q.far)).toHaveLength(5);
    for (const q of round) expect(POINTERS).toContain(answerOf(q));
  });

  it("wyjaśnienie mówi, skąd wzięło się słowo", () => {
    const glasses = SENTENCES.find((s) => s.en.includes("glasses"));
    if (glasses === undefined) throw new Error("brak zdania");
    expect(why({ sentence: glasses, far: true })).toBe(
      "liczba mnoga (to słowo po angielsku zawsze jest w mnogiej) + daleko → those",
    );
  });
});
