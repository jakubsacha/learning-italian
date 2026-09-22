import { describe, expect, it } from "vitest";
import { HARD_IN_SESSION, NEW_BATCH, REVIEW_BATCH, buildQueue, newLeft } from "./queue";
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

});

describe("utrwalanie", () => {
  it("podaje wyłącznie słowa, które już znasz", () => {
    const pool = words(10);
    const progress = progressOf(pool.slice(0, 4).map((w) => [w, review({ due: TODAY })]));
    const queue = buildQueue("review", input({ pool, progress }), firstRng);
    expect(ids(queue).sort()).toEqual(["slowo0", "slowo1", "slowo2", "slowo3"]);
  });

  it("bez znanych słów daje pustą rundę", () => {
    expect(buildQueue("review", input(), firstRng)).toEqual([]);
  });

  it("w dniu bez zaległości dopełnia rundę słowami z najbliższym terminem", () => {
    const pool = words(30);
    const progress = progressOf(
      pool.map((w, i) => [w, review({ due: asDayNumber(TODAY + 1 + i) })]),
    );
    const queue = buildQueue("review", input({ pool, progress }), firstRng);
    expect(queue).toHaveLength(REVIEW_BATCH);
    // najbliższe terminy wchodzą, najdalsze zostają na później
    expect(ids(queue)).toContain("slowo0");
    expect(ids(queue)).not.toContain("slowo29");
  });

  it("zaległe i trudne mają pierwszeństwo przed resztą", () => {
    const pool = words(40);
    const progress = progressOf(
      pool.map((w, i) => [
        w,
        i === 39
          ? review({ due: asDayNumber(TODAY - 3) }) // zaległe
          : i === 38
            ? review({ due: asDayNumber(TODAY + 90), lapses: 5 }) // trudne, daleko
            : review({ due: asDayNumber(TODAY + 1 + i) }),
      ]),
    );
    const queue = ids(buildQueue("review", input({ pool, progress }), firstRng));
    expect(queue).toContain("slowo39");
    expect(queue).toContain("slowo38");
  });

  it("nie rośnie ponad rundę nawet przy dużej zaległości", () => {
    const pool = words(60);
    const progress = progressOf(pool.map((w) => [w, review({ due: asDayNumber(TODAY - 1) })]));
    expect(buildQueue("review", input({ pool, progress }), firstRng)).toHaveLength(REVIEW_BATCH);
  });
});

describe("nowe słowa", () => {
  it("podaje paczkę najczęstszych słów, których jeszcze nie znasz", () => {
    const pool = words(30);
    const progress = progressOf([[pool[0]!, review()]]);
    const queue = buildQueue("new", input({ pool, progress }), firstRng);
    expect(queue).toHaveLength(NEW_BATCH);
    expect(ids(queue)[0]).toBe("slowo1");
    expect(ids(queue)).not.toContain("slowo0");
  });

  it("działa także po wyczerpaniu dziennego limitu — sam o nie prosisz", () => {
    expect(buildQueue("new", input({ newDone: 99 }), firstRng)).toHaveLength(NEW_BATCH);
  });

  it("nie miesza w nich powtórek", () => {
    const pool = words(20);
    const progress = progressOf(pool.slice(0, 5).map((w) => [w, review({ due: TODAY })]));
    const queue = buildQueue("new", input({ pool, progress }), firstRng);
    expect(queue.every((w) => !progress.has(w.id))).toBe(true);
  });
});
