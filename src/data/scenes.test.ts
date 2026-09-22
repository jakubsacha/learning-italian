import { describe, expect, it } from "vitest";
import { COURSE_SCENE, SCENES } from "./scenes";
import { tilesOf } from "../domain/phrases/forms";

const situations = SCENES.filter((s) => s.id !== COURSE_SCENE);

describe("materiał rozmówek", () => {
  it("ma dwanaście sytuacji i zdania z kursu jako ostatnią grupę", () => {
    expect(situations).toHaveLength(12);
    expect(SCENES.at(-1)?.id).toBe(COURSE_SCENE);
    expect(SCENES.at(-1)!.phrases.length).toBeGreaterThan(150);
  });

  it("każda kwestia występuje raz — jest swoim kluczem w zapisie", () => {
    const ids = SCENES.flatMap((s) => s.phrases.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("każda sytuacja ma Twoje kwestie i kwestie rozmówcy", () => {
    for (const scene of situations) {
      expect(scene.phrases.some((p) => p.who === "ty"), scene.id).toBe(true);
      expect(scene.phrases.some((p) => p.who === "oni"), scene.id).toBe(true);
    }
  });

  it("kwestie są na tyle krótkie, żeby dało się je ułożyć i zapisać ze słuchu", () => {
    for (const scene of situations) {
      for (const p of scene.phrases) expect(tilesOf(p.it).length, p.it).toBeLessThanOrEqual(12);
    }
  });

  it("każda kwestia ma tłumaczenie i kończy się znakiem zdania", () => {
    for (const p of SCENES.flatMap((s) => s.phrases)) {
      expect(p.pl.length, p.it).toBeGreaterThan(0);
      expect(/[.?!]$/.test(p.it.trim()), p.it).toBe(true);
    }
  });

  it("kolejność w dialogu jest ciągła, od zera", () => {
    for (const scene of SCENES) {
      expect(scene.phrases.map((p) => p.order)).toEqual(scene.phrases.map((_, i) => i));
    }
  });

  it("zaczynamy od sytuacji, w której się nie rozumie — ona przydaje się wszędzie", () => {
    expect(SCENES[0]?.title).toBe("Kiedy nie rozumiesz");
  });
});
