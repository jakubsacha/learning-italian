import { describe, expect, it } from "vitest";
import {
  EXTRA_FACTS,
  advanceFacts,
  answerFact,
  buildFactQueue,
  choicesFor,
  chooseFactForm,
  chronological,
  nextCandidates,
  factSummary,
  isDated,
  learningOrder,
  startFacts,
  timelineRight,
  timelineRound,
} from "./session";
import { RETRY_AFTER } from "../session";
import { asFactId } from "./types";
import type { AnswerKind, Fact, FactQueueInput } from "./types";
import { TODAY, firstRng, review } from "../fixtures";

let n = 0;
const fact = (
  a: string,
  kind: AnswerKind,
  over: Partial<Fact> = {},
): Fact => {
  n += 1;
  return {
    id: asFactId("pytanie " + n + "?"),
    q: "pytanie " + n + "?",
    a,
    kind,
    key: false,
    lesson: 1,
    section: "",
    page: null,
    event: null,
    order: n,
    ...over,
  };
};

const DATES = ["1 września 1939 r.", "17 września 1939 r.", "3 września 1939 r.", "28 września 1939 r.", "10 maja 1940 r."]
  .map((a, i) => fact(a, "data", { event: { when: 19390901 + i, label: "wydarzenie " + i } }));
const PEOPLE = ["Winston Churchill", "Stefan Starzyński", "Ignacy Mościcki", "Vidkun Quisling"].map((a) =>
  fact(a, "osoba"),
);
const ALL = [...DATES, ...PEOPLE];

const input = (over: Partial<FactQueueInput> = {}): FactQueueInput => ({
  facts: ALL,
  progress: new Map(),
  today: TODAY,
  newLimit: 5,
  newDone: 0,
  extra: false,
  ...over,
});

describe("test wyboru", () => {
  it("błędne odpowiedzi są tego samego rodzaju co dobra", () => {
    const choices = choicesFor(DATES[0]!, ALL, firstRng);
    expect(choices).toHaveLength(4);
    for (const c of choices) expect(c.text).toMatch(/19(39|40) r\.$/);
  });

  it("dokładnie jedna odpowiedź jest dobra, i nie powtarza się jako błędna", () => {
    const twin = fact("1 września 1939 r.", "data");
    const choices = choicesFor(DATES[0]!, [...ALL, twin], firstRng);
    expect(choices.filter((c) => c.correct)).toHaveLength(1);
    expect(choices.filter((c) => c.text === "1 września 1939 r.")).toHaveLength(1);
  });

  it("gdy brak podobnych odpowiedzi, zostaje karta zamiast kulawego testu", () => {
    const lonely = fact("coś jedynego", "bitwa");
    const progress = new Map([[lonely.id, review({ reps: 5 })]]);
    const session = startFacts(input({ facts: [lonely], progress, newDone: 99 }), [lonely], () => 0.99);
    if (session.status !== "active") throw new Error("spodziewano się czynnej sesji");
    expect(session.current.kind).toBe("card");
  });
});

describe("dobór formy", () => {
  it("nowy fakt najpierw do przeczytania", () => {
    expect(chooseFactForm(undefined, firstRng)).toBe("card");
  });

  it("znany fakt bywa i kartą, i testem", () => {
    const forms = new Set([0, 0.5, 0.9].map((r) => chooseFactForm(review({ reps: 3 }), () => r)));
    expect([...forms].sort()).toEqual(["card", "choice"]);
  });
});

describe("kolejność nauki", () => {
  it("najpierw pogrubione z książki, w kolejności stron", () => {
    const a = fact("a", "osoba", { order: 1 });
    const b = fact("b", "osoba", { order: 2, key: true });
    const c = fact("c", "osoba", { order: 3 });
    const d = fact("d", "osoba", { order: 4, key: true });
    expect(learningOrder([a, b, c, d]).map((f) => f.a)).toEqual(["b", "d", "a", "c"]);
  });

  it("dzienny limit nowych, a paczka dodatkowa go omija", () => {
    expect(buildFactQueue(input({ newLimit: 3 }), firstRng)).toHaveLength(3);
    expect(buildFactQueue(input({ newDone: 99 }), firstRng)).toHaveLength(0);
    expect(buildFactQueue(input({ newDone: 99, extra: true }), firstRng)).toHaveLength(
      Math.min(EXTRA_FACTS, ALL.length),
    );
  });

  it("powtórki przed nowymi", () => {
    const due = PEOPLE[3]!;
    const queue = buildFactQueue(input({ progress: new Map([[due.id, review()]]) }), firstRng);
    expect(queue[0]?.id).toBe(due.id);
  });
});

describe("sesja", () => {
  it("„Nie wiem” wraca kilka kart dalej i nie zalicza", () => {
    const state = input({ newLimit: 9 });
    const session = startFacts(state, ALL, firstRng);
    if (session.status !== "active") throw new Error("spodziewano się czynnej sesji");
    const result = answerFact(session, { via: "self", grade: "again" }, state)!;
    if (result.session.status !== "active") throw new Error("spodziewano się czynnej sesji");
    expect(result.session.queue[RETRY_AFTER]?.id).toBe(session.current.fact.id);
    expect(factSummary(result.session)).toMatchObject({ passed: 0, total: 9 });
  });

  it("odpowiedź z wyboru do karty niczego nie zapisuje", () => {
    const state = input();
    const session = startFacts(state, ALL, firstRng);
    expect(answerFact(session, { via: "choice", correct: true }, state)).toBeNull();
  });

  it("przerobiona sesja się kończy", () => {
    let state = input({ newLimit: 2 });
    let session = startFacts(state, ALL, firstRng);
    for (let i = 0; i < 2; i++) {
      const r = answerFact(session, { via: "self", grade: "good" }, state)!;
      state = { ...state, progress: new Map([...state.progress, [r.fact.id, r.review]]) };
      session = advanceFacts(r.session, state, ALL, firstRng);
    }
    expect(session).toMatchObject({ status: "done", reason: "finished" });
  });
});

describe("oś czasu", () => {
  it("runda ma cztery wydarzenia z różnych dni", () => {
    const round = timelineRound(ALL, firstRng);
    expect(round).toHaveLength(4);
    expect(new Set(round.map((f) => f.event.when)).size).toBe(4);
  });

  it("dobra kolejność to rosnące daty", () => {
    const round = timelineRound(ALL, firstRng);
    expect(timelineRight(chronological(round))).toBe(true);
    expect(timelineRight(chronological(round).slice().reverse())).toBe(false);
  });

  it("data z samym miesiącem nie trafia do rundy z innym wydarzeniem z tego miesiąca", () => {
    const june = fact("w czerwcu 1940 r.", "data", { event: { when: 19400600, label: "czerwiec" } });
    const june22 = fact("22 czerwca 1940 r.", "data", { event: { when: 19400622, label: "22 czerwca" } });
    const june10 = fact("10 czerwca 1940 r.", "data", { event: { when: 19400610, label: "10 czerwca" } });
    const may = fact("10 maja 1940 r.", "data", { event: { when: 19400510, label: "maj" } });
    for (let seed = 0; seed < 20; seed++) {
      const round = timelineRound([june, june22, june10, may], () => (seed % 9) / 9, 4);
      const ids = round.map((f) => f.id);
      expect(ids.includes(june.id) && (ids.includes(june22.id) || ids.includes(june10.id))).toBe(false);
    }
    // dwa dokładne dni z jednego miesiąca da się ułożyć
    expect(timelineRound([june22, june10], firstRng, 2)).toHaveLength(2);
  });

  it("fakty bez daty nie trafiają na oś", () => {
    expect(timelineRound(PEOPLE, firstRng)).toHaveLength(0);
    expect(PEOPLE.some(isDated)).toBe(false);
  });
});

describe("układanie całej osi", () => {
  const ev = (a: string, when: number) => fact(a, "data", { event: { when, label: a } }) as never;

  it("następne jest zawsze najwcześniejsze z pozostałych", () => {
    const sep1 = ev("1 IX", 19390901);
    const sep17 = ev("17 IX", 19390917);
    const may = ev("10 V 1940", 19400510);
    expect(nextCandidates([may, sep17, sep1]).map((f: Fact) => f.a)).toEqual(["1 IX"]);
  });

  it("gdy książka podaje sam miesiąc, przyjmuje każdą nierozstrzygalną kolejność", () => {
    const june = ev("w czerwcu 1940", 19400600);
    const june10 = ev("10 VI 1940", 19400610);
    const june22 = ev("22 VI 1940", 19400622);
    const july = ev("w lipcu 1940", 19400700);
    const next = nextCandidates([july, june22, june10, june]).map((f: Fact) => f.a).sort();
    expect(next).toEqual(["10 VI 1940", "w czerwcu 1940"]);
    // po 10 czerwca: „w czerwcu" i 22 czerwca — znów obie dobre
    expect(nextCandidates([july, june22, june]).map((f: Fact) => f.a).sort()).toEqual([
      "22 VI 1940",
      "w czerwcu 1940",
    ]);
  });

  it("z jednego wydarzenia zostaje ono samo, z pustej listy — nic", () => {
    const one = ev("x", 19400101);
    expect(nextCandidates([one])).toEqual([one]);
    expect(nextCandidates([])).toEqual([]);
  });
});

