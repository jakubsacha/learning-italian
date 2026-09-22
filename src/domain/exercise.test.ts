import { describe, expect, it } from "vitest";
import { CHOICE_COUNT, buildExercise, chooseForm, distractorPool } from "./exercise";
import type { Form } from "./exercise";
import { firstRng, progressOf, review, sentence, word, words } from "./fixtures";

const ctx = (over: Partial<Parameters<typeof chooseForm>[0]> = {}) => {
  const w = word("ciao", 0);
  return {
    word: w,
    progress: progressOf([[w, review({ reps: 5 })]]),
    cardsOnly: false,
    canListen: true,
    canType: true,
    sentences: [],
    ...over,
  };
};

/** Zbiera formy, jakie w ogóle mogą wypaść: losowanie zwraca każdy indeks po kolei. */
const formsOf = (context: Parameters<typeof chooseForm>[0]): string[] => {
  const seen = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const form: Form = chooseForm(context, () => i / 12);
    seen.add(form.kind === "choice" ? "choice-" + form.direction : form.kind);
  }
  return [...seen].sort();
};

describe("dobór formy pytania", () => {
  it("nowe słowo zawsze dostaje kartę", () => {
    const w = word("ciao", 0);
    expect(chooseForm(ctx({ word: w, progress: new Map() }), firstRng)).toEqual({ kind: "card" });
  });

  it("zakładka Fiszki podaje wyłącznie karty, niezależnie od stażu słowa", () => {
    expect(formsOf(ctx({ cardsOnly: true }))).toEqual(["card"]);
  });

  it("po pierwszej powtórce dochodzi rozpoznawanie, ale jeszcze nie produkcja", () => {
    const w = word("ciao", 0);
    const early = ctx({ word: w, progress: progressOf([[w, review({ reps: 1 })]]) });
    expect(formsOf(early)).toEqual(["card", "choice-it-pl", "listen"]);
  });

  it("od trzeciej powtórki dochodzi wpisywanie i zdania z luką", () => {
    const w = word("ciao", 0);
    const mature = ctx({
      word: w,
      progress: progressOf([[w, review({ reps: 3 })]]),
      sentences: [sentence("ciao a tutti", "ciao")],
    });
    expect(formsOf(mature)).toEqual(["card", "choice-it-pl", "choice-pl-it", "cloze", "listen", "type"]);
  });

  it("bez zdań nie ma luki, choćby słowo było dobrze znane", () => {
    const w = word("ciao", 0);
    const noSentences = ctx({ word: w, progress: progressOf([[w, review({ reps: 9 })]]) });
    expect(formsOf(noSentences)).not.toContain("cloze");
  });

  it("bez syntezatora nie ma ćwiczeń ze słuchu", () => {
    expect(formsOf(ctx({ canListen: false }))).not.toContain("listen");
  });

  it("trudne słowo wraca do łatwych form", () => {
    const w = word("ciao", 0);
    const leech = ctx({ word: w, progress: progressOf([[w, review({ reps: 9, lapses: 3 })]]) });
    expect(formsOf(leech)).toEqual(["card", "choice-it-pl", "listen"]);
  });
});

describe("składanie ćwiczenia", () => {
  const pool = words(20);
  const target = pool[0]!;
  const progress = progressOf(pool.map((w) => [w, review({ reps: 4 })]));
  const base = { word: target, progress, pool, sentences: [] };

  it("test wyboru ma cztery odpowiedzi i dokładnie jedną poprawną", () => {
    const ex = buildExercise({ kind: "choice", direction: "it-pl" }, base, firstRng);
    if (ex.kind !== "choice") throw new Error("spodziewano się testu wyboru");
    expect(ex.choices).toHaveLength(CHOICE_COUNT);
    expect(ex.choices.filter((c) => c.correct)).toHaveLength(1);
    expect(ex.choices.find((c) => c.correct)?.text).toBe(target.pl);
  });

  it("kierunek polski → włoski pyta o włoską postać", () => {
    const ex = buildExercise({ kind: "choice", direction: "pl-it" }, base, firstRng);
    if (ex.kind !== "choice") throw new Error("spodziewano się testu wyboru");
    expect(ex.choices.find((c) => c.correct)?.text).toBe(target.it);
  });

  it("żadna błędna odpowiedź nie powtarza słowa pytanego", () => {
    const ex = buildExercise({ kind: "listen" }, base, firstRng);
    if (ex.kind !== "listen") throw new Error("spodziewano się ćwiczenia ze słuchu");
    expect(ex.choices.filter((c) => c.text === target.pl)).toHaveLength(1);
  });

  it("luka dzieli zdanie wokół chowanego słowa", () => {
    const ex = buildExercise(
      { kind: "cloze" },
      { ...base, sentences: [sentence("dove vai città oggi", "città")] },
      firstRng,
    );
    if (ex.kind !== "cloze") throw new Error("spodziewano się zdania z luką");
    expect(ex.split).toEqual({ before: "dove vai ", after: " oggi" });
    expect(ex.choices.find((c) => c.correct)?.text).toBe("città");
  });

  it("luka bez zdania cofa się do karty zamiast wystawiać pusty ekran", () => {
    expect(buildExercise({ kind: "cloze" }, base, firstRng).kind).toBe("card");
  });

  it("wpisywanie przyjmuje obie formy zapisane po ukośniku", () => {
    const w = word("scusi / scusa", 0);
    const ex = buildExercise({ kind: "type" }, { ...base, word: w }, firstRng);
    if (ex.kind !== "type") throw new Error("spodziewano się wpisywania");
    expect(ex.accepted).toContain("scusi");
    expect(ex.accepted).toContain("scusa");
  });

  it("dystraktory na starcie to najczęstsze słowa, nie losowe z całego słownika", () => {
    const fresh = distractorPool(words(100), new Map());
    expect(fresh).toHaveLength(40);
    expect(fresh[0]?.id).toBe("slowo0");
  });

  it("gdy poznanych słów jest dość, dystraktory biorą się tylko z nich", () => {
    const big = words(100);
    const known = progressOf(big.slice(0, 9).map((w) => [w, review()]));
    expect(distractorPool(big, known)).toHaveLength(9);
  });
});

describe("wpisywanie tam, gdzie ma sens", () => {
  it("słowo wyłączone z wpisywania nigdy nie dostaje tej formy", () => {
    const w = word("non vedo l'ora", 0);
    const noTyping = ctx({
      word: w,
      progress: progressOf([[w, review({ reps: 9 })]]),
      canType: false,
    });
    expect(formsOf(noTyping)).not.toContain("type");
  });
});
