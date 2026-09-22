import { describe, expect, it } from "vitest";
import {
  ACTIVITY_DAYS,
  FORECAST_DAYS,
  activityOf,
  categoriesOf,
  countStates,
  forecastOf,
  hardestOf,
  statsOf,
  summarise,
  trimHistory,
} from "./stats";
import { startSession, answer } from "./session";
import { asDateKey, asDayNumber, asDays } from "./types";
import type { DailyCounts } from "./types";
import { TODAY, firstRng, input, progressOf, review, word, words } from "./fixtures";

const NOW = new Date(2026, 1, 15, 12, 0, 0);
const key = (day: number): string => "2026-02-" + String(day).padStart(2, "0");
const counts = (entries: readonly (readonly [string, number])[]): DailyCounts =>
  new Map(entries.map(([k, v]) => [asDateKey(k), v]));

describe("statystyki słów", () => {
  it("dzieli słowa na cztery stany", () => {
    const pool = words(4);
    const progress = progressOf([
      [pool[0]!, review({ interval: asDays(3) })],
      [pool[1]!, review({ interval: asDays(10) })],
      [pool[2]!, review({ interval: asDays(30) })],
    ]);
    expect(countStates(pool, progress)).toEqual({
      untouched: 1,
      learning: 1,
      young: 1,
      mature: 1,
    });
  });

  it("wykres aktywności ma trzydzieści dni i kończy się na dziś", () => {
    const activity = activityOf(counts([[key(15), 12]]), NOW);
    expect(activity).toHaveLength(ACTIVITY_DAYS);
    expect(activity.at(-1)).toEqual({ key: asDateKey(key(15)), count: 12 });
    expect(activity.at(-2)?.count).toBe(0);
  });

  it("plan powtórek wrzuca zaległe do dzisiejszego słupka", () => {
    const pool = words(3);
    const progress = progressOf([
      [pool[0]!, review({ due: asDayNumber(TODAY - 9) })],
      [pool[1]!, review({ due: TODAY })],
      [pool[2]!, review({ due: asDayNumber(TODAY + 2) })],
    ]);
    const forecast = forecastOf(pool, progress, TODAY);
    expect(forecast).toHaveLength(FORECAST_DAYS);
    expect(forecast[0]?.count).toBe(2);
    expect(forecast[2]?.count).toBe(1);
  });

  it("plan pomija powtórki dalsze niż dwa tygodnie", () => {
    const pool = words(1);
    const progress = progressOf([[pool[0]!, review({ due: asDayNumber(TODAY + 99) })]]);
    expect(forecastOf(pool, progress, TODAY).every((d) => d.count === 0)).toBe(true);
  });

  it("kategorie pokazują tylko ruszone, od najlepiej opanowanych", () => {
    const a = { ...word("uno", 0), category: "liczby" };
    const b = { ...word("due", 1), category: "liczby" };
    const c = { ...word("rosso", 2), category: "kolory" };
    const d = { ...word("blu", 3), category: "puste" };
    const progress = progressOf([[a, review()], [c, review()]]);
    expect(categoriesOf([a, b, c, d], progress, ["liczby", "kolory", "puste"])).toEqual([
      { category: "kolory", total: 1, done: 1 },
      { category: "liczby", total: 2, done: 1 },
    ]);
  });

  it("najtrudniejsze słowa idą od największej liczby wpadek", () => {
    const pool = words(3);
    const progress = progressOf([
      [pool[0]!, review({ lapses: 3 })],
      [pool[1]!, review({ lapses: 7 })],
      [pool[2]!, review({ lapses: 1 })],
    ]);
    expect(hardestOf(pool, progress).map((h) => h.lapses)).toEqual([7, 3]);
  });

  it("seria liczy się wstecz i nie łamie jej dzisiejsze zero", () => {
    const stats = statsOf(words(2), [], new Map(), counts([[key(13), 4], [key(14), 6]]), NOW, TODAY);
    expect(stats.streak).toBe(2);
    expect(stats.activityTotal).toBe(10);
    expect(stats.activeDays).toBe(2);
    expect(stats.bestDay).toBe(6);
  });

  it("historia przycina się do stu osiemdziesięciu dni, zostawiając najnowsze", () => {
    const long: DailyCounts = new Map(
      Array.from({ length: 200 }, (_, i) => [asDateKey("2026-" + String(i).padStart(4, "0")), i]),
    );
    const trimmed = trimHistory(long);
    expect(trimmed.size).toBe(180);
    expect(trimmed.has(asDateKey("2026-0199"))).toBe(true);
    expect(trimmed.has(asDateKey("2026-0000"))).toBe(false);
  });
});

describe("pasek sesji", () => {
  const deps = { sentencesFor: () => [], canListen: false, rng: firstRng };

  it("mianownik stoi w miejscu, licznik rośnie dopiero po zaliczeniu", () => {
    const state = input({ newLimit: 4 });
    const session = startSession("mix", state, deps);
    expect(summarise(session, state.progress)).toMatchObject({ left: 4, passed: 0, total: 4 });
    const after = answer(session, { via: "self", grade: "good" }, state)!;
    expect(summarise(after.session, state.progress)).toMatchObject({ passed: 1, total: 4 });
  });

  it('"Nie wiem" nie powiększa sesji', () => {
    const state = input({ newLimit: 4 });
    const after = answer(startSession("mix", state, deps), { via: "self", grade: "again" }, state)!;
    expect(summarise(after.session, state.progress)).toMatchObject({ passed: 0, total: 4, left: 4 });
  });

  it("rozbija resztę na powtórki, trudne i nowe", () => {
    const pool = words(6);
    const state = input({
      pool,
      newLimit: 2,
      progress: progressOf([
        [pool[4]!, review({ lapses: 4, due: TODAY })],
        [pool[5]!, review({ due: TODAY })],
      ]),
    });
    const summary = summarise(startSession("mix", state, deps), state.progress);
    expect(summary).toMatchObject({ fresh: 2, tough: 1, again: 1, left: 4 });
  });

  it("skończona sesja to sto procent i zero kart", () => {
    const done = startSession("hard", input(), deps);
    expect(summarise(done, new Map())).toMatchObject({ left: 0, percent: 100 });
  });
});
