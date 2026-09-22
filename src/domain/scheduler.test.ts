import { describe, expect, it } from "vitest";
import { EVIDENCE, MAX_INTERVAL, isLeech, schedule, stateOf } from "./scheduler";
import { asDayNumber, asDays, type Grade, type Review } from "./types";

const TODAY = asDayNumber(20_700);
const fresh = (): Review | null => null;

const run = (grades: Grade[], weight = 1): Review => {
  let review: Review | null = null;
  for (const grade of grades) review = schedule(review, grade, TODAY, weight);
  return review!;
};

const path = (count: number, weight: number): number[] => {
  let review: Review | null = null;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    review = schedule(review, "good", TODAY, weight);
    out.push(review.interval);
  }
  return out;
};

describe("harmonogram", () => {
  it("nowe słowo dostaje inny odstęp dla każdej z czterech ocen", () => {
    expect(schedule(fresh(), "again", TODAY).interval).toBe(0);
    expect(schedule(fresh(), "hard", TODAY).interval).toBe(1);
    expect(schedule(fresh(), "good", TODAY).interval).toBe(2);
    expect(schedule(fresh(), "easy", TODAY).interval).toBe(4);
  });

  it("„Nie wiem” zeruje odstęp, liczy wpadkę i obniża łatwość", () => {
    const after = run(["good", "good", "again"]);
    expect(after.interval).toBe(0);
    expect(after.lapses).toBe(1);
    expect(after.ease).toBeCloseTo(2.3, 5);
  });

  it("termin to dzisiaj powiększone o odstęp", () => {
    const after = schedule(fresh(), "easy", TODAY);
    expect(after.due).toBe(TODAY + after.interval);
  });

  it("waga dowodu rozsuwa odstępy zgodnie z formą ćwiczenia", () => {
    // te same liczby pilnuje też test end-to-end na interfejsie
    expect(path(5, 0.85)).toEqual([2, 4, 9, 19, 40]);
    expect(path(5, EVIDENCE.card)).toEqual([2, 5, 13, 33, 83]);
    expect(path(5, EVIDENCE.type)).toEqual([2, 6, 18, 54, 162]);
  });

  it("odstęp nie przekracza roku mimo mnożenia wag", () => {
    let review: Review | null = { ease: 3.2, interval: asDays(300), due: TODAY, reps: 20, lapses: 0 };
    for (let i = 0; i < 5; i++) review = schedule(review, "easy", TODAY, 1.2);
    expect(review!.interval).toBe(MAX_INTERVAL);
  });

  it("łatwość trzyma się w widełkach", () => {
    const low = run(Array<Grade>(20).fill("again"));
    const high = run(Array<Grade>(20).fill("easy"));
    expect(low.ease).toBeGreaterThanOrEqual(1.3);
    expect(high.ease).toBeLessThanOrEqual(3.2);
  });

  it("po wpadce „Dobrze” wraca do kilku dni, nie do poprzedniego odstępu", () => {
    const after = run(["easy", "easy", "again", "good"]);
    expect(after.interval).toBeGreaterThanOrEqual(2);
    expect(after.interval).toBeLessThan(10);
  });
});

describe("stan słowa", () => {
  const withInterval = (interval: number): Review => ({
    ease: 2.5, interval: asDays(interval), due: TODAY, reps: 3, lapses: 0,
  });

  it("dzieli słowa według długości odstępu", () => {
    expect(stateOf(undefined)).toBe("untouched");
    expect(stateOf(withInterval(3))).toBe("learning");
    expect(stateOf(withInterval(7))).toBe("young");
    expect(stateOf(withInterval(20))).toBe("young");
    expect(stateOf(withInterval(21))).toBe("mature");
  });

  it("trudne słowo to takie z trzema wpadkami", () => {
    expect(isLeech(undefined)).toBe(false);
    expect(isLeech({ ...withInterval(3), lapses: 2 })).toBe(false);
    expect(isLeech({ ...withInterval(3), lapses: 3 })).toBe(true);
  });
});
