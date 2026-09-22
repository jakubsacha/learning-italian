import { describe, expect, it } from "vitest";
import { mergeCounts, mergeProgress } from "./merge";
import { boardRows, sharedGoal } from "./board";
import { asDateKey, asDayNumber, asWordId } from "./types";
import type { BoardRow, DailyCounts, Username } from "./types";
import { progressOf, review, word } from "./fixtures";

const NOW = new Date(2026, 1, 15, 9, 0, 0);
const counts = (entries: readonly (readonly [string, number])[]): DailyCounts =>
  new Map(entries.map(([k, v]) => [asDateKey(k), v]));

describe("łączenie postępu z dwóch urządzeń", () => {
  const ciao = word("ciao", 0);

  it("wygrywa karta z większą liczbą powtórek", () => {
    const mine = progressOf([[ciao, review({ reps: 2, due: asDayNumber(999) })]]);
    const theirs = progressOf([[ciao, review({ reps: 5, due: asDayNumber(100) })]]);
    expect(mergeProgress(mine, theirs).get(asWordId("ciao"))?.reps).toBe(5);
  });

  it("przy tylu samych powtórkach wygrywa późniejszy termin", () => {
    const mine = progressOf([[ciao, review({ reps: 3, due: asDayNumber(100) })]]);
    const theirs = progressOf([[ciao, review({ reps: 3, due: asDayNumber(180) })]]);
    expect(mergeProgress(mine, theirs).get(asWordId("ciao"))?.due).toBe(180);
  });

  it("nic nie ginie: słowa z obu stron trafiają do wyniku", () => {
    const grazie = word("grazie", 1);
    const merged = mergeProgress(
      progressOf([[ciao, review()]]),
      progressOf([[grazie, review()]]),
    );
    expect([...merged.keys()].sort()).toEqual(["ciao", "grazie"]);
  });

  it("połączenie nie zmienia żadnej ze stron", () => {
    const mine = progressOf([[ciao, review({ reps: 1 })]]);
    mergeProgress(mine, progressOf([[ciao, review({ reps: 9 })]]));
    expect(mine.get(asWordId("ciao"))?.reps).toBe(1);
  });

  it("dla każdego dnia zostaje większy wynik", () => {
    const merged = mergeCounts(
      counts([["2026-02-14", 10], ["2026-02-15", 3]]),
      counts([["2026-02-15", 12], ["2026-02-16", 5]]),
    );
    expect([...merged]).toEqual([
      [asDateKey("2026-02-14"), 10],
      [asDateKey("2026-02-15"), 12],
      [asDateKey("2026-02-16"), 5],
    ]);
  });
});

describe("wspólny cel", () => {
  const row = (username: string, today: number, mature: number): BoardRow => ({
    username: username as Username,
    today,
    mature,
  });

  it("tablica idzie od najaktywniejszych dziś, przy remisie po utrwalonych", () => {
    expect(boardRows([row("a", 3, 90), row("b", 8, 1), row("c", 3, 200)]).map((r) => r.username))
      .toEqual(["b", "c", "a"]);
  });

  it("liczy się suma całej dwójki, nie wynik jednej osoby", () => {
    const goal = sharedGoal(
      [counts([["2026-02-15", 18]]), counts([["2026-02-15", 22]])],
      NOW,
      40,
    );
    expect(goal).toMatchObject({ total: 40, done: true });
  });

  it("wspólna seria łamie się w dniu, w którym razem nie wyrobiliście celu", () => {
    const mine = counts([["2026-02-13", 25], ["2026-02-14", 5], ["2026-02-15", 30]]);
    const theirs = counts([["2026-02-13", 20], ["2026-02-14", 5], ["2026-02-15", 20]]);
    expect(sharedGoal([mine, theirs], NOW, 40).streak).toBe(1);
  });

  it("dzisiejszy brak celu nie kasuje serii z poprzednich dni", () => {
    const goal = sharedGoal(
      [counts([["2026-02-13", 50], ["2026-02-14", 50], ["2026-02-15", 1]])],
      NOW,
      40,
    );
    expect(goal).toMatchObject({ streak: 2, done: false });
  });
});
