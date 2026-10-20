import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { stubSpeech } from "./helpers";

const cards = (page: Page) => page.getByTestId("panel-cards");
const word = (page: Page) => cards(page).getByTestId("flashcard").getAttribute("data-word");

/** Zostawia włączony tylko jeden dział. */
async function only(page: Page, keep: string): Promise<void> {
  for (const id of ["ubrania", "przymiotniki", "pytania", "rzeczy"]) {
    if (id !== keep) await page.locator(`[data-section="${id}"]`).click();
  }
}

test.beforeEach(async ({ page }) => {
  await stubSpeech(page);
  await page.goto("/angielski/index.html");
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("angielski.")) localStorage.removeItem(k);
  });
  await page.reload({ waitUntil: "networkidle" });
});

test("fiszka odwraca się na tłumaczenie, „Umiem!” daje gwiazdkę i następną kartę", async ({ page }) => {
  await expect(cards(page).getByTestId("count")).toHaveText("0 / 39");
  const first = await word(page);
  await cards(page).getByTestId("flip").click();
  await expect(cards(page).getByTestId("flashcard")).toHaveClass(/flipped/);
  await expect(cards(page).getByTestId("answer")).not.toBeEmpty();
  await cards(page).getByTestId("know").click();
  await expect(cards(page).getByTestId("count")).toHaveText("1 / 39");
  await expect(page.getByTestId("stars")).toHaveText("⭐ 1");
  expect(await word(page)).not.toBe(first);
});

test("„Powtórz” odkłada kartę trzy dalej", async ({ page }) => {
  const first = await word(page);
  await page.keyboard.press("Space");
  await page.keyboard.press("1");
  for (let i = 0; i < 3; i++) {
    expect(await word(page)).not.toBe(first);
    await page.keyboard.press("Space");
    await page.keyboard.press("2");
  }
  expect(await word(page)).toBe(first);
});

test("filtr działów zmienia talię i przeżywa przeładowanie", async ({ page }) => {
  await page.locator('[data-section="ubrania"]').click();
  await expect(cards(page).getByTestId("count")).toHaveText("0 / 23");
  await page.locator('[data-section="przymiotniki"]').click();
  await page.locator('[data-section="pytania"]').click();
  // ostatniego działu nie da się wyłączyć
  await page.locator('[data-section="rzeczy"]').click();
  await expect(cards(page).getByTestId("count")).toHaveText("0 / 6");
  await expect(page.locator('[data-section="rzeczy"]')).toHaveAttribute("aria-pressed", "true");
  await page.reload({ waitUntil: "networkidle" });
  await expect(cards(page).getByTestId("count")).toHaveText("0 / 6");
  await page.getByRole("button", { name: /wszystko/ }).click();
  await expect(cards(page).getByTestId("count")).toHaveText("0 / 39");
});

test("po całej talii jest konfetti i powtórka trudnych", async ({ page }) => {
  await only(page, "rzeczy");
  await expect(cards(page).getByTestId("count")).toHaveText("0 / 6");
  await page.keyboard.press("Space");
  await page.keyboard.press("1");
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Space");
    await page.keyboard.press("2");
  }
  await expect(cards(page).getByTestId("finish")).toContainText("Trudne: 1");
  await expect(page.getByTestId("confetti")).toHaveCount(1);
  await cards(page).getByTestId("tricky").click();
  await expect(cards(page).getByTestId("count")).toHaveText("0 / 1");
});

test("gra: dziesięć pytań, odpowiedzi z jednego działu, wynik i gwiazdki", async ({ page }) => {
  await page.getByRole("tab", { name: /Gra/ }).click();
  const game = page.getByTestId("panel-game");
  // pierwsza zła — seria się zeruje i trzeba kliknąć „Dalej"
  await game.locator('.choice[data-ok="0"]').first().click();
  await expect(game.locator(".choice.no")).toHaveCount(1);
  await expect(game.getByTestId("streak")).toHaveText("🔥 0");
  await game.getByTestId("game-next").click();
  for (let i = 2; i <= 10; i++) {
    await expect(game.locator(".game-top")).toContainText(`Pytanie ${i} z 10`);
    await game.locator('.choice[data-ok="1"]').click();
  }
  await expect(game.getByTestId("game-score")).toContainText("Dobrze: 9 z 10 · najdłuższa seria: 9");
  // 9 za odpowiedzi + 3 za wynik
  await expect(page.getByTestId("stars")).toHaveText("⭐ 12");
  await game.getByTestId("play-again").click();
  await expect(game.locator(".game-top")).toContainText("Pytanie 1 z 10");
});

test("słówka: wszystkie kafelki z obrazkami, umiane z ptaszkiem", async ({ page }) => {
  const first = await word(page);
  await page.keyboard.press("Space");
  await page.keyboard.press("2");
  await page.getByRole("tab", { name: /Słówka/ }).click();
  const list = page.getByTestId("panel-list");
  await expect(list.locator(".word-tile")).toHaveCount(39);
  await expect(list.locator(".word-tile .pic")).toHaveCount(39);
  await expect(list.locator(".word-tile.known")).toHaveCount(1);
  await expect(list.locator(`.word-tile[data-word="${first}"]`)).toHaveClass(/known/);
});

test("na telefonie nic nie wystaje poza ekran", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const tab of [/Fiszki/, /Gra/, /Słówka/]) {
    await page.getByRole("tab", { name: tab }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), String(tab)).toBe(false);
  }
});
