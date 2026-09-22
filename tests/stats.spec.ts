import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { dayKey, dayNumber, deckWords, localMode, openTab, seed, stubSpeech } from "./helpers";

/** Stan z wyraźnym podziałem: 40 utrwalonych, 35 młodych, 65 w nauce. */
async function learnedState(page: Page): Promise<void> {
  const words = await deckWords(page, 140);
  const today = dayNumber();
  const srs: Record<string, { e: number; i: number; d: number; r: number; l: number }> = {};
  words.slice(0, 40).forEach((w, i) => (srs[w] = { e: 2.5, i: 25 + i, d: today + 3, r: 8, l: 0 }));
  words.slice(40, 75).forEach((w) => (srs[w] = { e: 2.5, i: 10, d: today, r: 5, l: 0 }));
  words
    .slice(75, 140)
    .forEach((w, i) => (srs[w] = { e: 2.2, i: 2, d: today, r: 2, l: i % 9 === 0 ? 4 : 0 }));

  const days: Record<string, number> = {};
  for (let d = 0; d < 30; d++) if (d % 5 !== 3) days[dayKey(-d)] = 10 + ((d * 7) % 40);
  await seed(page, { srs, days, newDone: 10 });
  await openTab(page, "Postęp");
}

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
});

test("pusty stan nie kłamie ani nie straszy", async ({ page }) => {
  await seed(page, {});
  await openTab(page, "Postęp");
  await expect(page.getByTestId("mature")).toHaveText("0");
  await expect(page.getByTestId("seen")).toHaveText("0");
  await expect(page.getByTestId("no-cats")).toContainText("Zacznij naukę");
  await expect(page.getByTestId("no-hard")).toBeVisible();
});

test("kafelki i pokrycie zgadzają się ze stanem powtórek", async ({ page }) => {
  await learnedState(page);
  await expect(page.getByTestId("mature")).toHaveText("40");
  await expect(page.getByTestId("seen")).toHaveText("140");
  await expect(page.getByTestId("cover")).toContainText("140 / 19");
});

test("podział poznanych sumuje się do liczby poznanych, nie do całego kursu", async ({ page }) => {
  await learnedState(page);
  const parts = await page
    .getByTestId("legend")
    .locator("b")
    .evaluateAll((list) => list.map((b) => Number(b.textContent)));
  expect(parts).toEqual([40, 35, 65]);
  expect(parts.reduce((a, b) => a + b, 0)).toBe(140);

  const widths = await page
    .getByTestId("segments")
    .locator("i")
    .evaluateAll((list) => list.map((i) => parseFloat((i as HTMLElement).style.width)));
  expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 1);
});

test("wykresy mają pełny zakres dni i opisy pod kursorem", async ({ page }) => {
  await learnedState(page);
  await expect(page.getByTestId("activity").locator("i")).toHaveCount(30);
  await expect(page.getByTestId("forecast").locator("i")).toHaveCount(14);
  expect(await page.getByTestId("activity").locator("i").first().getAttribute("title")).toMatch(
    /^\d{4}-\d{2}-\d{2}: \d+ fisz/,
  );
  expect(await page.getByTestId("forecast").locator("i").first().getAttribute("title")).toMatch(
    /^dziś: \d+$/,
  );
});

test("kategorie i najtrudniejsze słowa są wypełnione", async ({ page }) => {
  await learnedState(page);
  expect(await page.locator(".catbar").count()).toBeGreaterThan(0);
  expect(await page.locator(".catbar").first().textContent()).toMatch(/\d+ \/ \d+/);
  expect(await page.getByTestId("hardest").locator("tbody tr").count()).toBeGreaterThan(0);
  await expect(page.getByTestId("no-hard")).toHaveCount(0);
});

test("seria liczy dni z rzędu i nie łamie jej dzisiejsze zero", async ({ page }) => {
  await seed(page, { days: { [dayKey(-1)]: 12, [dayKey(-2)]: 8 } });
  await openTab(page, "Postęp");
  await expect(page.getByTestId("streak")).toHaveText("2");
});
