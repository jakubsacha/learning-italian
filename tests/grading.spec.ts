import { expect, test } from "@playwright/test";
import { askedWord, localMode, openTab, seed, stubSpeech } from "./helpers";

type Stored = { i: number; l: number; r: number };
const stored = (page: import("@playwright/test").Page, word: string): Promise<Stored> =>
  page.evaluate((w) => JSON.parse(localStorage["it250.srs"])[w] as Stored, word);

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
  await seed(page, { kind: "mix" });
});

test("cztery oceny mają różne, opisane odstępy", async ({ page }) => {
  await page.keyboard.press("Space");
  const labels = page.locator(".grades .btn small");
  await expect(labels.nth(0)).toHaveText("za chwilę");
  await expect(labels.nth(1)).toHaveText("jutro");
  await expect(labels.nth(2)).toHaveText("2 dni");
  await expect(labels.nth(3)).toHaveText("4 dni");
});

test("klawisze 1–4 odpowiadają ocenom", async ({ page }) => {
  const grade = async (key: string): Promise<Stored> => {
    const word = await askedWord(page);
    await page.keyboard.press("Space");
    await page.keyboard.press(key);
    return stored(page, word);
  };
  expect((await grade("1")).l).toBe(1); // Nie wiem liczy wpadkę
  expect((await grade("2")).i).toBe(1); // Słabo: jutro
  expect((await grade("3")).i).toBe(2); // Dobrze: 2 dni
  expect((await grade("4")).i).toBe(4); // Łatwo: 4 dni
});

test("kliknięcie oceny działa tak samo jak klawisz", async ({ page }) => {
  const word = await askedWord(page);
  await page.getByTestId("reveal").click();
  await page.locator('.grades [data-grade="easy"]').click();
  expect((await stored(page, word)).i).toBe(4);
});

test("„Nie wiem” cofa słowo do nauki i dokłada wpadkę", async ({ page }) => {
  const word = await askedWord(page);
  await page.keyboard.press("Space");
  await page.keyboard.press("3");
  await page.reload({ waitUntil: "networkidle" });
  expect(await stored(page, word)).toMatchObject({ i: 2, l: 0, r: 1 });
});

test("zła odpowiedź w quizie cofa słowo do powtórki", async ({ page }) => {
  await seed(page, {
    kind: "mix",
    srs: Object.fromEntries(
      ["ciao", "sì", "no", "grazie", "prego", "salve", "buongiorno", "buonasera", "piacere"].map(
        (w) => [w, { e: 2.5, i: 20, d: 0, r: 6, l: 0 }],
      ),
    ),
  });
  await openTab(page, "Quiz");

  const quiz = page.getByTestId("panel-quiz");
  const asked = (await quiz.locator(".q").textContent())!.trim();
  const options = quiz.locator(".opts .opt");
  const texts = await options.allTextContents();
  const correctRow = await page.evaluate(
    (w) => JSON.parse(localStorage["it250.srs"])[w] as Stored,
    asked,
  );
  expect(correctRow.i).toBe(20);

  // klikamy cokolwiek poza właściwym tłumaczeniem
  const verdict = quiz.locator(".verdict");
  await options.nth(0).click();
  await expect(verdict).toBeVisible();
  if ((await verdict.textContent())!.startsWith("Poprawnie")) {
    const after = await stored(page, asked);
    expect(after.i).toBe(0);
    expect(after.l).toBe(1);
  } else {
    // trafiliśmy za pierwszym razem — postęp słowa ma zostać nietknięty
    expect((await stored(page, asked)).i).toBe(20);
  }
  expect(texts.length).toBe(4);
});
