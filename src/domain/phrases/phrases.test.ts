import { describe, expect, it } from "vitest";
import {
  PHRASE_EVIDENCE,
  buildPhraseExercise,
  choosePhraseForm,
  dictationTolerance,
  gradePhrase,
  judgeDictation,
  orderIsRight,
  tilesOf,
} from "./forms";
import {
  EXTRA_PHRASES,
  advancePhrases,
  answerPhrase,
  buildPhraseQueue,
  freshPhrases,
  phraseSummary,
  startPhrases,
} from "./session";
import { RETRY_AFTER } from "../session";
import { asPhraseId, asSceneId } from "./types";
import type { Phrase, PhraseExerciseKind, PhraseQueueInput, Scene, Speaker } from "./types";
import { asDayNumber, type Review } from "../types";
import { TODAY, firstRng, review } from "../fixtures";

const phrase = (it: string, who: Speaker, scene = "bar", order = 0): Phrase => ({
  id: asPhraseId(it),
  it,
  pl: "po polsku: " + it,
  who,
  scene: asSceneId(scene),
  order,
});

const sceneOf = (id: string, count: number): Scene => ({
  id: asSceneId(id),
  icon: "☕",
  title: id,
  phrases: Array.from({ length: count }, (_, i) =>
    phrase(`${id} zdanie numer ${i}.`, i % 2 === 0 ? "ty" : "oni", id, i),
  ),
});

const SCENES = [sceneOf("bar", 6), sceneOf("hotel", 6), sceneOf("treno", 6)];

const input = (over: Partial<PhraseQueueInput> = {}): PhraseQueueInput => ({
  scenes: SCENES,
  progress: new Map(),
  today: TODAY,
  newLimit: 5,
  newDone: 0,
  scene: null,
  extra: false,
  ...over,
});

const progressOf = (entries: readonly (readonly [Phrase, Review])[]) =>
  new Map(entries.map(([p, r]) => [p.id, r]));

/** Każda forma, jaka może wypaść — losowanie zwraca po kolei każdy indeks. */
const formsOf = (p: Phrase, r: Review | undefined, canListen = true): PhraseExerciseKind[] => {
  const seen = new Set<PhraseExerciseKind>();
  for (let i = 0; i < 12; i++) seen.add(choosePhraseForm({ phrase: p, review: r, canListen }, () => i / 12));
  return [...seen].sort();
};

describe("drabinka form kwestii", () => {
  const mine = phrase("Un caffè, per favore.", "ty");
  const theirs = phrase("Cosa prende?", "oni");

  it("nowa kwestia zawsze najpierw do przeczytania i wysłuchania", () => {
    expect(formsOf(mine, undefined)).toEqual(["read"]);
  });

  it("po pierwszej powtórce dochodzi słuchanie i rozsypanka", () => {
    expect(formsOf(mine, review({ reps: 1 }))).toEqual(["listen", "order", "read"]);
  });

  it("od drugiej powtórki własną kwestię się mówi i zapisuje ze słuchu", () => {
    expect(formsOf(mine, review({ reps: 2 }))).toEqual(["dictation", "listen", "order", "read", "speak"]);
  });

  it("kwestii rozmówcy nie trzeba umieć powiedzieć — tylko zrozumieć", () => {
    const forms = formsOf(theirs, review({ reps: 5 }));
    expect(forms).not.toContain("speak");
    expect(forms).not.toContain("order");
    expect(forms).toContain("listen");
  });

  it("bez syntezatora nie ma słuchania ani dyktanda", () => {
    const forms = formsOf(mine, review({ reps: 5 }), false);
    expect(forms).not.toContain("listen");
    expect(forms).not.toContain("dictation");
  });

  it("kwestia, na której się wykładasz, wraca do łatwych form", () => {
    expect(formsOf(mine, review({ reps: 9, lapses: 3 }))).toEqual(["listen", "order", "read"]);
  });
});

describe("ćwiczenia", () => {
  it("rozsypanka ma wszystkie słowa zdania i nigdy nie jest już ułożona", () => {
    const p = phrase("Il conto, per favore.", "ty");
    for (let seed = 0; seed < 20; seed++) {
      const ex = buildPhraseExercise("order", p, SCENES, () => (seed % 7) / 7);
      if (ex.kind !== "order") throw new Error("spodziewano się rozsypanki");
      expect(ex.tiles.map((t) => t.text).sort()).toEqual(["Il", "conto,", "favore.", "per"]);
      expect(ex.tiles.some((t, i) => t.slot !== i)).toBe(true);
    }
  });

  it("interpunkcja zostaje przy słowie", () => {
    expect(tilesOf("Scusi, dov'è la stazione?").map((t) => t.text)).toEqual([
      "Scusi,",
      "dov'è",
      "la",
      "stazione?",
    ]);
  });

  it("słuchanie daje cztery różne znaczenia, jedno poprawne", () => {
    const p = SCENES[0]!.phrases[0]!;
    const ex = buildPhraseExercise("listen", p, SCENES, firstRng);
    if (ex.kind !== "listen") throw new Error("spodziewano się słuchania");
    expect(ex.choices).toHaveLength(4);
    expect(new Set(ex.choices.map((c) => c.text)).size).toBe(4);
    expect(ex.choices.filter((c) => c.correct).map((c) => c.text)).toEqual([p.pl]);
  });
});

describe("ocena odpowiedzi", () => {
  const p = phrase("Posso pagare con la carta?", "ty");

  it("rozsypanka ułożona dobrze liczy się mimo interpunkcji i wielkości liter", () => {
    expect(orderIsRight(["posso", "pagare", "con", "la", "carta?"], p.it)).toBe(true);
    expect(orderIsRight(["pagare", "posso", "con", "la", "carta?"], p.it)).toBe(false);
  });

  it("dyktando odróżnia bezbłędne, literówkę i błąd", () => {
    expect(judgeDictation("Posso pagare con la carta", p.it)).toBe("exact");
    expect(judgeDictation("Poso pagare con la carta", p.it)).toBe("typo");
    expect(judgeDictation("Posso pagare in contanti", p.it)).toBe("wrong");
    expect(judgeDictation("", p.it)).toBe("wrong");
  });

  it("zgubiony akcent to nie błąd", () => {
    expect(judgeDictation("E lontano da qui", "È lontano da qui?")).toBe("exact");
  });

  it("dłuższe zdanie wybacza więcej literówek niż krótkie", () => {
    expect(dictationTolerance("Sì.")).toBe(1);
    expect(dictationTolerance("Una bottiglia d'acqua e due bicchieri di vino rosso.")).toBeGreaterThan(2);
  });

  it("dyktando bez błędu waży najwięcej, z literówką jak zwykłe Dobrze", () => {
    const ex = { kind: "dictation", phrase: p } as const;
    expect(gradePhrase(ex, { via: "typed", text: p.it })).toMatchObject({
      grade: "good",
      weight: PHRASE_EVIDENCE.dictation,
      typed: "exact",
    });
    expect(gradePhrase(ex, { via: "typed", text: "Poso pagare con la carta?" })).toMatchObject({
      grade: "good",
      weight: 1,
      typed: "typo",
    });
  });

  it("odpowiedź nie pasująca do formy niczego nie zapisuje", () => {
    expect(gradePhrase({ kind: "dictation", phrase: p }, { via: "choice", correct: true })).toBeNull();
    expect(gradePhrase({ kind: "read", phrase: p }, { via: "typed", text: p.it })).toBeNull();
  });
});

describe("kolejka rozmówek", () => {
  it("nowe kwestie idą w kolejności dialogu, z pierwszej sytuacji", () => {
    const queue = buildPhraseQueue(input({ newLimit: 3 }), firstRng);
    expect(queue.map((p) => p.order)).toEqual([0, 1, 2]);
    expect(queue.every((p) => p.scene === asSceneId("bar"))).toBe(true);
  });

  it("wybrana sytuacja daje nowe kwestie jako pierwsza", () => {
    const queue = buildPhraseQueue(input({ scene: asSceneId("hotel") }), firstRng);
    expect(queue[0]?.scene).toBe(asSceneId("hotel"));
  });

  it("po skończonej sytuacji nowe biorą się z następnej", () => {
    const bar = SCENES[0]!;
    const progress = progressOf(bar.phrases.map((p) => [p, review({ due: asDayNumber(TODAY + 9) })]));
    expect(freshPhrases(input({ progress, scene: bar.id }))[0]?.scene).toBe(asSceneId("hotel"));
  });

  it("powtórki idą przed nowymi", () => {
    const due = SCENES[2]!.phrases[0]!;
    const queue = buildPhraseQueue(input({ progress: progressOf([[due, review()]]) }), firstRng);
    expect(queue[0]?.id).toBe(due.id);
    expect(queue).toHaveLength(6);
  });

  it("dzienny limit nowych jest przestrzegany, a paczka dodatkowa go omija", () => {
    expect(buildPhraseQueue(input({ newDone: 5 }), firstRng)).toHaveLength(0);
    expect(buildPhraseQueue(input({ newDone: 5, extra: true }), firstRng)).toHaveLength(EXTRA_PHRASES);
  });
});

describe("sesja rozmówek", () => {
  const deps = { canListen: true, rng: firstRng };

  it("pusta sesja mówi, że nie było czego podać", () => {
    expect(startPhrases(input({ newDone: 99 }), deps)).toMatchObject({ status: "done", reason: "empty" });
  });

  it("„Nie wiem” wraca kilka kart dalej i nie zalicza", () => {
    const state = input({ newLimit: 6 });
    const session = startPhrases(state, deps);
    if (session.status !== "active") throw new Error("spodziewano się czynnej sesji");
    const result = answerPhrase(session, { via: "self", grade: "again" }, state)!;
    if (result.session.status !== "active") throw new Error("spodziewano się czynnej sesji");
    expect(result.session.passed).toBe(0);
    expect(result.session.queue[RETRY_AFTER]?.id).toBe(session.current.phrase.id);
    expect(phraseSummary(result.session)).toMatchObject({ passed: 0, total: 6 });
  });

  it("przerobiona sesja kończy się, a nie dosypuje w kółko", () => {
    let state = input({ newLimit: 2 });
    let session = startPhrases(state, deps);
    for (let i = 0; i < 2; i++) {
      const result = answerPhrase(session, { via: "self", grade: "good" }, state)!;
      state = { ...state, progress: new Map([...state.progress, [result.phrase.id, result.review]]) };
      session = advancePhrases(result.session, state, deps);
    }
    expect(session).toMatchObject({ status: "done", reason: "finished" });
  });

  it("drugiej odpowiedzi na to samo pytanie nie da się udzielić", () => {
    const state = input();
    const once = answerPhrase(startPhrases(state, deps), { via: "self", grade: "good" }, state)!;
    expect(answerPhrase(once.session, { via: "self", grade: "good" }, state)).toBeNull();
  });
});
