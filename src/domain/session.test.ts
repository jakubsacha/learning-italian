import { describe, expect, it } from "vitest";
import { RETRY_AFTER, advance, answer, gradeAnswer, remaining, startSession } from "./session";
import type { Answer, Deps } from "./session";
import { EVIDENCE, RECOGNITION_EVIDENCE } from "./scheduler";
import { asDayNumber } from "./types";
import type { Session } from "./types";
import { TODAY, firstRng, input, progressOf, review, word, words } from "./fixtures";

const deps: Deps = { sentencesFor: () => [], canListen: false, rng: firstRng };

const active = (session: Session) => {
  if (session.status !== "active") throw new Error("spodziewano się czynnej sesji");
  return session;
};

describe("ocena odpowiedzi", () => {
  const card = { kind: "card", word: word("ciao", 0), review: null } as const;

  it("fiszka przepuszcza Twoją własną ocenę i waży jeden", () => {
    expect(gradeAnswer(card, { via: "self", grade: "hard" })).toEqual({
      grade: "hard",
      weight: EVIDENCE.card,
      correct: true,
    });
  });

  it('"Nie wiem" nie jest poprawną odpowiedzią', () => {
    expect(gradeAnswer(card, { via: "self", grade: "again" }).correct).toBe(false);
  });

  it("test wyboru włoski → polski waży mniej niż polski → włoski", () => {
    const w = word("ciao", 0);
    const easy = { kind: "choice", word: w, direction: "it-pl", choices: [] } as const;
    const harder = { kind: "choice", word: w, direction: "pl-it", choices: [] } as const;
    expect(gradeAnswer(easy, { via: "choice", correct: true }).weight).toBe(RECOGNITION_EVIDENCE);
    expect(gradeAnswer(harder, { via: "choice", correct: true }).weight).toBe(EVIDENCE.choice);
  });

  it("wpisanie bez błędu waży najwięcej, literówka jak zwykłe Dobrze", () => {
    const typed = { kind: "type", word: word("ciao", 0), accepted: ["ciao"] } as const;
    const exact: Answer = { via: "typed", outcome: "exact" };
    const typo: Answer = { via: "typed", outcome: "typo" };
    expect(gradeAnswer(typed, exact)).toEqual({ grade: "good", weight: EVIDENCE.type, correct: true });
    expect(gradeAnswer(typed, typo)).toEqual({ grade: "good", weight: 1, correct: true });
    expect(gradeAnswer(typed, { via: "typed", outcome: "wrong" }).grade).toBe("again");
  });
});

describe("przebieg sesji", () => {
  it("sesja zaczyna się od pytania, nie od odpowiedzi", () => {
    const session = active(startSession("mix", input({ newLimit: 3 }), deps));
    expect(session.phase).toEqual({ phase: "question" });
    expect(remaining(session)).toBe(3);
  });

  it("suma kart nie rośnie z każdą odpowiedzią", () => {
    let session = startSession("mix", input({ newLimit: 5 }), deps);
    const totals: number[] = [];
    let state = input({ newLimit: 5 });
    for (let i = 0; i < 5 && session.status === "active"; i++) {
      totals.push(remaining(session) + (session.status === "active" ? session.passed : 0));
      const result = answer(session, { via: "self", grade: "good" }, state);
      if (result === null) break;
      state = input({
        newLimit: 5,
        newDone: i + 1,
        progress: new Map([...state.progress, [result.word.id, result.review]]),
      });
      session = advance(result.session, state, deps);
    }
    expect(totals).toEqual([5, 5, 5, 5, 5]);
  });

  it('"Nie wiem" wraca do kolejki i nie zalicza karty', () => {
    const session = active(startSession("mix", input({ newLimit: 6 }), deps));
    const result = answer(session, { via: "self", grade: "again" }, input({ newLimit: 6 }));
    const after = active(result!.session);
    expect(after.passed).toBe(0);
    expect(after.queue).toHaveLength(6);
    expect(after.queue[RETRY_AFTER]?.id).toBe(session.current.word.id);
  });

  it("poprawna odpowiedź zalicza kartę i nie wraca do kolejki", () => {
    const session = active(startSession("mix", input({ newLimit: 6 }), deps));
    const after = active(answer(session, { via: "self", grade: "good" }, input({ newLimit: 6 }))!.session);
    expect(after.passed).toBe(1);
    expect(after.queue).toHaveLength(5);
  });

  it("drugiej odpowiedzi na to samo pytanie nie da się udzielić", () => {
    const session = active(startSession("mix", input({ newLimit: 3 }), deps));
    const once = answer(session, { via: "self", grade: "good" }, input({ newLimit: 3 }))!;
    expect(answer(once.session, { via: "self", grade: "good" }, input({ newLimit: 3 }))).toBeNull();
  });

  it("pierwsze zetknięcie ze słowem jest oznaczone — tylko takie liczy się do limitu dnia", () => {
    const pool = words(1);
    const only = pool[0]!;
    const first = answer(
      active(startSession("mix", input({ pool }), deps)),
      { via: "self", grade: "good" },
      input({ pool }),
    )!;
    expect(first.wasNew).toBe(true);
    const known = input({ pool, progress: progressOf([[only, review()]]) });
    const again = answer(active(startSession("mix", known, deps)), { via: "self", grade: "good" }, known)!;
    expect(again.wasNew).toBe(false);
  });

  it("pusta kolejka kończy sesję z terminem najbliższej powtórki i zapasem nowych", () => {
    const pool = words(5);
    const state = input({
      pool,
      newDone: 99,
      progress: progressOf(pool.slice(0, 2).map((w) => [w, review({ due: asDayNumber(TODAY + 3) })])),
    });
    const session = startSession("mix", state, deps);
    expect(session).toMatchObject({
      status: "done",
      reason: "daily-finished",
      nextDue: 3,
      newInReserve: 3,
    });
  });

  it("trening trudnych bez trudnych słów mówi to wprost", () => {
    expect(startSession("hard", input(), deps)).toMatchObject({ reason: "no-leeches" });
  });

  it("trening trudnych nie odbudowuje się w kółko po przerobieniu listy", () => {
    const pool = words(2);
    const progress = progressOf(pool.map((w) => [w, review({ lapses: 4 })]));
    const state = input({ pool, progress, newDone: 99 });
    let session = startSession("hard", state, deps);
    for (let i = 0; i < 2; i++) {
      const result = answer(active(session), { via: "self", grade: "good" }, state);
      session = advance(result!.session, state, deps);
    }
    expect(session).toMatchObject({ status: "done", reason: "hard-finished" });
  });

  it("zakładka Fiszki podaje karty, choćby słowa były dawno opanowane", () => {
    const pool = words(4);
    const state = input({
      pool,
      newDone: 99,
      progress: progressOf(pool.map((w) => [w, review({ reps: 9 })])),
    });
    const session = active(startSession("cards", state, { ...deps, canListen: true }));
    expect(session.current.kind).toBe("card");
  });
});
