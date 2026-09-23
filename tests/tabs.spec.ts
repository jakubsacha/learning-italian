import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  answerCorrectly,
  askedWord,
  currentView,
  dayNumber,
  deckWords,
  localMode,
  openTab,
  seed,
  stubSpeech,
} from "./helpers";

const known = (words: readonly string[], offsetDays = 0) =>
  Object.fromEntries(
    words.map((w) => [w, { e: 2.5, i: 6, d: dayNumber(offsetDays), r: 4, l: 0 }]),
  );

const doneTitle = (page: Page) => page.locator('[data-view="done"] b');

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
});

test.describe("Nauka", () => {
  test("miesza powtórki z nowymi słowami", async ({ page }) => {
    const words = await deckWords(page, 3);
    await seed(page, { kind: "mix", limit: 5, srs: known(words) });
    await expect(page.getByTestId("mix")).toHaveText("3 powtórki · 5 nowych słów");
  });
});

test.describe("Powtórki", () => {
  test("podaje tylko słowa, które już znasz", async ({ page }) => {
    const words = await deckWords(page, 4);
    await seed(page, { kind: "review", limit: 30, srs: known(words) });
    await expect(page.getByTestId("left")).toHaveText("Powtórki: 4 karty");
    const asked = new Set<string>();
    for (let i = 0; i < 4; i++) {
      asked.add(await askedWord(page));
      await answerCorrectly(page);
    }
    for (const word of asked) expect(words).toContain(word);
  });

  test("bez znanych słów kieruje do nowych, zamiast pokazywać pusty ekran", async ({ page }) => {
    await seed(page, { kind: "review" });
    expect(await currentView(page)).toBe("done");
    await expect(doneTitle(page)).toHaveText("Nie masz jeszcze czego powtarzać");
    await expect(page.getByTestId("more")).toHaveCount(0);
  });

  test("działa także w dniu bez zaległości i daje kolejną rundę", async ({ page }) => {
    const words = await deckWords(page, 3);
    await seed(page, { kind: "review", srs: known(words, 10) });
    await expect(page.getByTestId("left")).toHaveText("Powtórki: 3 karty");
    for (let i = 0; i < 3; i++) await answerCorrectly(page);
    await expect(doneTitle(page)).toHaveText(/Runda powtórek zrobiona/);
    await page.getByTestId("more").click();
    expect(await currentView(page)).not.toBe("done");
  });

  test("nie dokłada nowych słów", async ({ page }) => {
    const words = await deckWords(page, 3);
    await seed(page, { kind: "review", srs: known(words) });
    await expect(page.getByTestId("mix")).toHaveText("3 powtórki");
  });
});

test.describe("Nowe", () => {
  test("podaje paczkę dziesięciu nowych, same fiszki", async ({ page }) => {
    await seed(page, { kind: "new" });
    await expect(page.getByTestId("left")).toHaveText("Nowe słowa: 10 kart");
    for (let i = 0; i < 10; i++) {
      expect(await currentView(page)).toBe("card");
      await answerCorrectly(page);
    }
    await expect(doneTitle(page)).toHaveText(/Paczka nowych słów za Tobą/);
  });

  test("nie miesza w paczce powtórek, nawet zaległych", async ({ page }) => {
    const words = await deckWords(page, 5);
    await seed(page, { kind: "new", srs: known(words, -2) });
    await expect(page.getByTestId("mix")).toHaveText("10 nowych słów");
    expect(words).not.toContain(await askedWord(page));
  });

  test("działa po wyczerpaniu dziennego limitu, a Nauka potem nie dokłada nowych", async ({
    page,
  }) => {
    await seed(page, { kind: "new", limit: 5, newDone: 5 });
    await expect(page.getByTestId("left")).toHaveText("Nowe słowa: 10 kart");
    await openTab(page, "Nauka");
    expect(await currentView(page)).toBe("done");
  });

  test("kolejna paczka bierze następne słowa, nie te same", async ({ page }) => {
    await seed(page, { kind: "new" });
    const first: string[] = [];
    for (let i = 0; i < 10; i++) {
      first.push(await askedWord(page));
      await answerCorrectly(page);
    }
    await page.getByTestId("more").click();
    expect(first).not.toContain(await askedWord(page));
  });
});

test("przełączanie zakładek nie gubi odpowiedzi", async ({ page }) => {
  await seed(page, { kind: "new" });
  const word = await askedWord(page);
  await answerCorrectly(page);
  await openTab(page, "Powtórki");
  await expect(page.getByTestId("left")).toHaveText("Powtórki: 1 karta");
  expect(await askedWord(page)).toBe(word);
});
