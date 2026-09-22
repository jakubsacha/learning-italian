import { describe, expect, it } from "vitest";
import { HARD_IN_SESSION, HARD_SESSION_SIZE, buildQueue, newLeft } from "./queue";
import { asDayNumber, asDays } from "./types";
import { TODAY, firstRng, input, progressOf, review, words } from "./fixtures";

const ids = (list: readonly { id: string }[]): string[] => list.map((w) => w.id);

describe("kolejka dzienna", () => {
  it("bierze tylko tyle nowych słów, ile zostało do dziennego limitu", () => {
    const base = input({ newLimit: 10, newDone: 7 });
    expect(newLeft(base)).toBe(3);
    expect(buildQueue("mix", base, firstRng)).toHaveLength(3);
  });

  it("nowe słowa wchodzą w kolejności częstotliwości", () => {
    const queue = buildQueue("mix", input({ newLimit: 3 }), firstRng);
    expect(ids(queue).sort()).toEqual(["slowo0", "slowo1", "slowo2"]);
  });

  it("nie dokłada nowych, gdy limit wyczerpany, ale powtórki wciąż podaje", () => {
    const pool = words(5);
    const due = pool[0]!;
    const queue = buildQueue(
      "mix",
      input({
        pool,
        newDone: 10,
        progress: progressOf([[due, review({ due: asDayNumber(TODAY - 1) })]]),
      }),
      firstRng,
    );
    expect(ids(queue)).toEqual(["slowo0"]);
  });

  it("pomija powtórki, których termin jeszcze nie nadszedł", () => {
    const pool = words(3);
    const later = progressOf(pool.map((w) => [w, review({ due: asDayNumber(TODAY + 5) })]));
    expect(buildQueue("mix", input({ pool, progress: later, newDone: 10 }), firstRng)).toEqual([]);
  });

  it("dociąga najwyżej pięć trudnych słów przed terminem", () => {
    const pool = words(12);
    const progress = progressOf(
      pool.map((w, i) => [w, review({ due: asDayNumber(TODAY + 30), lapses: 3 + i })]),
    );
    const queue = buildQueue("mix", input({ pool, progress, newDone: 10 }), firstRng);
    expect(queue).toHaveLength(HARD_IN_SESSION);
    // najpierw te, na których wykładasz się najczęściej
    expect(ids(queue).sort()).toEqual(["slowo11", "slowo10", "slowo9", "slowo8", "slowo7"].sort());
  });

  it("nie dociąga trudnych, które już dziś były na ekranie", () => {
    const pool = words(3);
    const progress = progressOf(
      pool.map((w) => [w, review({ due: asDayNumber(TODAY + 30), lapses: 4 })]),
    );
    const seen = new Set(pool.map((w) => w.id));
    expect(buildQueue("mix", input({ pool, progress, seen, newDone: 10 }), firstRng)).toEqual([]);
  });

  it("nie dubluje słowa, które jest i zaległe, i trudne", () => {
    const pool = words(2);
    const progress = progressOf(pool.map((w) => [w, review({ lapses: 5 })]));
    const queue = buildQueue("mix", input({ pool, progress, newDone: 10 }), firstRng);
    expect(ids(queue).sort()).toEqual(["slowo0", "slowo1"]);
  });

  it("sesja poza planem bierze dziesięć nowych mimo wyczerpanego limitu", () => {
    const queue = buildQueue("mix", input({ newDone: 99, extra: true }), firstRng);
    expect(queue).toHaveLength(10);
  });

  it("sesja poza planem bez nowych słów sięga po najbliższe terminy", () => {
    const pool = words(15);
    const progress = progressOf(
      pool.map((w, i) => [w, review({ due: asDayNumber(TODAY + 10 + i), interval: asDays(10) })]),
    );
    const queue = buildQueue("mix", input({ pool, progress, extra: true, newDone: 99 }), firstRng);
    expect(ids(queue)).toEqual(
      Array.from({ length: 10 }, (_, i) => "slowo" + String(i)),
    );
  });

  it("trening trudnych podaje wyłącznie trudne, najwyżej dwadzieścia", () => {
    const pool = words(30);
    const progress = progressOf(pool.map((w, i) => [w, review({ lapses: i < 25 ? 3 : 0 })]));
    const queue = buildQueue("hard", input({ pool, progress }), firstRng);
    expect(queue).toHaveLength(HARD_SESSION_SIZE);
    expect(queue.every((w) => (progress.get(w.id)?.lapses ?? 0) >= 3)).toBe(true);
  });

  it("trening trudnych bez trudnych słów daje pustą kolejkę", () => {
    expect(buildQueue("hard", input(), firstRng)).toEqual([]);
  });
});
