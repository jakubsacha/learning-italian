import { expect, test } from "@playwright/test";
import { dayKey, dayNumber, localMode, seed, stubSpeech } from "./helpers";

/** Stan z wyraźnym podziałem: 40 utrwalonych, 35 młodych, 65 w nauce. */
async function learnedState(page: import("@playwright/test").Page) {
  const srs = await page.evaluate((today) => {
    const out: Record<string, AppReview> = {};
    DATA.words.slice(0, 40).forEach((w, i) => (out[w.it] = { e: 2.5, i: 25 + i, d: today + 3, r: 8, l: 0 }));
    DATA.words.slice(40, 75).forEach((w) => (out[w.it] = { e: 2.5, i: 10, d: today, r: 5, l: 0 }));
    DATA.words.slice(75, 140).forEach((w, i) => (out[w.it] = { e: 2.2, i: 2, d: today, r: 2, l: i % 9 === 0 ? 4 : 0 }));
    return out;
  }, dayNumber());
  const days: Record<string, number> = {};
  for (let d = 0; d < 30; d++) if (d % 5 !== 3) days[dayKey(-d)] = 10 + ((d * 7) % 40);
  await seed(page, { srs, days, newDone: 10 });
  await page.click('[data-tab="stats"]');
}

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
});

test("pusty stan nie kłamie ani nie straszy", async ({ page }) => {
  await seed(page, {});
  await page.click('[data-tab="stats"]');
  await expect(page.locator("#st-mature")).toHaveText("0");
  await expect(page.locator("#st-seen")).toHaveText("0");
  await expect(page.locator("#st-cats")).toContainText("Zacznij naukę");
  await expect(page.locator("#st-hard-none")).toBeVisible();
});

test("kafelki i pokrycie zgadzają się ze stanem powtórek", async ({ page }) => {
  await learnedState(page);
  await expect(page.locator("#st-mature")).toHaveText("40");
  await expect(page.locator("#st-seen")).toHaveText("140");
  const total = await page.evaluate(() => DATA.words.length);
  await expect(page.locator("#st-cover-txt")).toContainText(`140 / ${total}`);
});

test("podział poznanych sumuje się do liczby poznanych, nie do całego kursu", async ({ page }) => {
  await learnedState(page);
  const parts = await page.evaluate(() =>
    [...document.querySelectorAll("#st-legend b")].map((b) => Number(b.textContent)));
  expect(parts).toEqual([40, 35, 65]);
  expect(parts.reduce((a, b) => a + b, 0)).toBe(140);
  // segmenty wypełniają cały pasek: liczone względem poznanych
  const widths = await page.evaluate(() =>
    [...document.querySelectorAll("#st-seg i")].map((i) => parseFloat((i as HTMLElement).style.width)));
  expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 1);
});

test("wykresy mają pełny zakres dni i opisy pod kursorem", async ({ page }) => {
  await learnedState(page);
  await expect(page.locator("#st-days i")).toHaveCount(30);
  await expect(page.locator("#st-due i")).toHaveCount(14);
  const firstTitle = await page.locator("#st-days i").first().getAttribute("title");
  expect(firstTitle).toMatch(/^\d{4}-\d{2}-\d{2}: \d+ fisz/);
  const dueTitle = await page.locator("#st-due i").first().getAttribute("title");
  expect(dueTitle).toMatch(/^dziś: \d+$/);
});

test("kategorie i najtrudniejsze słowa są wypełnione", async ({ page }) => {
  await learnedState(page);
  expect(await page.locator(".catbar").count()).toBeGreaterThan(0);
  const first = await page.locator(".catbar").first().textContent();
  expect(first).toMatch(/\d+ \/ \d+/);
  expect(await page.locator("#st-hard tr").count()).toBeGreaterThan(0);
  await expect(page.locator("#st-hard-none")).toBeHidden();
});
