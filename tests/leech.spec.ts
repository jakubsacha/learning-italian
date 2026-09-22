import { expect, test } from "@playwright/test";
import { answerCorrectly, currentView, dayNumber, localMode, seed, stubSpeech } from "./helpers";

const LEECH_THRESHOLD = 3;

const leeches = (words: string[], offsetDays = 30) =>
  Object.fromEntries(
    words.map((w, i) => [w, { e: 1.8, i: 30, d: dayNumber(offsetDays), r: 9, l: LEECH_THRESHOLD + i }]),
  );

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
});

test("trzy wpadki oznaczają słowo jako trudne", async ({ page }) => {
  const flags = await page.evaluate((threshold) => {
    const word = DATA.words[0]!;
    const at = (lapses: number) => {
      srs[word.it] = { e: 2, i: 3, d: 0, r: 5, l: lapses };
      return isLeech(word);
    };
    return { below: at(threshold - 1), at: at(threshold) };
  }, LEECH_THRESHOLD);
  expect(flags.below).toBe(false);
  expect(flags.at).toBe(true);
});

test("trudne słowo dostaje tylko łatwiejsze formy ćwiczeń", async ({ page }) => {
  const forms = await page.evaluate(() => {
    const word = DATA.words[0]!;
    srs[word.it] = { e: 1.8, i: 20, d: 0, r: 9, l: 5 };
    const set = new Set<string>();
    for (let i = 0; i < 300; i++) set.add(exerciseFor(word));
    return [...set].sort();
  });
  expect(forms).not.toContain("type");
  expect(forms).not.toContain("gap");
  expect(forms.every((f) => ["card", "quiz-it-pl", "listen"].includes(f))).toBe(true);
});

test("trudne słowa są dociągane przed terminem, ale nie wracają po przeładowaniu", async ({ page }) => {
  await seed(page, { kind: "cards", newDone: 10, srs: leeches(["ciao", "sì", "no", "grazie", "prego"]) });
  await expect(page.locator("#f-left")).toHaveText("Zostało 5 kart");

  for (let i = 0; i < 5; i++) await answerCorrectly(page);
  expect(await currentView(page)).toBe("done");

  await page.reload({ waitUntil: "networkidle" });
  expect(await currentView(page)).toBe("done");
  await expect(page.locator("#f-left")).toHaveText("Sesja skończona");
});

test("dociąganie trudnych jest ograniczone do pięciu na sesję", async ({ page }) => {
  const words = await page.evaluate(() => DATA.words.slice(0, 9).map((w) => w.it));
  await seed(page, { kind: "cards", newDone: 10, srs: leeches(words) });
  await expect(page.locator("#f-left")).toHaveText("Zostało 5 kart");
});

test("zakładka Trudne ma własną kolejkę i sensowny stan pusty", async ({ page }) => {
  await seed(page, { kind: "hard" });
  expect(await currentView(page)).toBe("done");
  await expect(page.locator("#f-done-title")).toHaveText("Nie ma trudnych słów");
  await expect(page.locator("#f-extra")).toBeHidden();

  await seed(page, { kind: "hard", srs: leeches(["ciao", "sì", "no"]) });
  await expect(page.locator("#f-left")).toHaveText("Trening trudnych: 3 karty");
  const onlyLeeches: boolean[] = [];
  for (let i = 0; i < 3; i++) {
    onlyLeeches.push(await page.evaluate(() => isLeech(current!)));
    await answerCorrectly(page);
  }
  expect(onlyLeeches.every(Boolean)).toBe(true);
  await expect(page.locator("#f-done-title")).toHaveText(/Trudne przerobione/);
});

test("ekran końca dnia wymienia słowa, na których się wykładasz", async ({ page }) => {
  await seed(page, { kind: "cards", newDone: 10, srs: leeches(["ciao", "sì"], 0) });
  for (let i = 0; i < 2; i++) await answerCorrectly(page);
  await expect(page.locator("#f-leeches")).toContainText("Najczęściej się wykładasz na:");
  // lista nie może wylądować w przycisku oceny (był taki błąd)
  await expect(page.locator("#f-hard")).not.toContainText("wykładasz");
});
