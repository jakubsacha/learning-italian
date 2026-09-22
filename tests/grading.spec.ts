import { expect, test } from "@playwright/test";
import { localMode, seed, stubSpeech } from "./helpers";

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
  await seed(page, { kind: "cards" });
});

test("cztery oceny mają różne, opisane odstępy", async ({ page }) => {
  await page.keyboard.press("Space");
  await expect(page.locator("#f-t-again")).toHaveText("za chwilę");
  await expect(page.locator("#f-t-hard")).toHaveText("jutro");
  await expect(page.locator("#f-t-good")).toHaveText("2 dni");
  await expect(page.locator("#f-t-easy")).toHaveText("4 dni");
});

test("klawisze 1–4 odpowiadają ocenom", async ({ page }) => {
  const grade = async (key: string) => {
    const word = await page.evaluate(() => current!.it);
    await page.keyboard.press("Space");
    await page.keyboard.press(key);
    return page.evaluate((w) => srs[w]!, word);
  };
  expect((await grade("1")).l).toBe(1); // Nie wiem liczy wpadkę
  expect((await grade("2")).i).toBe(1); // Słabo: jutro
  expect((await grade("3")).i).toBe(2); // Dobrze: 2 dni
  expect((await grade("4")).i).toBe(4); // Łatwo: 4 dni
});

test("waga dowodu rozsuwa odstępy zależnie od formy ćwiczenia", async ({ page }) => {
  const path = (weightKey: string) =>
    page.evaluate((k) => {
      let card: AppReview | null = null;
      const out: number[] = [];
      for (let n = 0; n < 5; n++) {
        card = schedule(card, "good", EVIDENCE[k]);
        out.push(card.i);
      }
      return out;
    }, weightKey);

  const choice = await path("quiz-it-pl");
  const card = await path("card");
  const typed = await path("type");

  expect(choice).toEqual([2, 4, 9, 19, 40]);
  expect(card).toEqual([2, 5, 13, 33, 83]);
  expect(typed).toEqual([2, 6, 18, 54, 162]);
  expect(typed.at(-1)!).toBeGreaterThan(card.at(-1)!);
  expect(card.at(-1)!).toBeGreaterThan(choice.at(-1)!);
});

test("odstęp nie przekracza roku", async ({ page }) => {
  const capped = await page.evaluate(() => {
    let card: AppReview = { e: 3.2, i: 300, d: 0, r: 20, l: 0 };
    for (let n = 0; n < 5; n++) card = schedule(card, "easy", 1.2);
    return card.i;
  });
  expect(capped).toBe(365);
});

test("zła odpowiedź w quizie cofa słowo do powtórki", async ({ page }) => {
  await page.click('[data-tab="quiz"]');
  const { word, correct } = await page.evaluate(() => {
    srs[qWord.it] = { e: 2.5, i: 20, d: 0, r: 6, l: 0 };
    return { word: qWord.it, correct: qWord.pl };
  });
  const opts = page.locator("#q-opts .opt");
  const texts = await opts.allTextContents();
  await opts.nth(texts.findIndex((t) => t.trim() !== correct)).click();
  const after = await page.evaluate((w) => srs[w]!, word);
  expect(after.i).toBe(0);
  expect(after.l).toBe(1);
});
