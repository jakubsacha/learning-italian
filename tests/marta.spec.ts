import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { currentView, dayKey, stubSpeech } from "./helpers";

/** Podstrona Marty ma własne klucze zapisu, więc czyścimy je osobno. */
async function seedMarta(
  page: Page,
  state: { srs?: Record<string, unknown>; days?: Record<string, number>; newDone?: number } = {},
): Promise<void> {
  await page.evaluate(
    ([s, key]) => {
      const put = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
      put("marta.srs", s.srs ?? {});
      put("marta.days", s.days ?? {});
      put("marta.day", { k: key, n: s.newDone ?? 0 });
      put("marta.seen", { k: key, w: [] });
    },
    [state, dayKey()] as const,
  );
  await page.reload({ waitUntil: "networkidle" });
}

test.beforeEach(async ({ page }) => {
  await stubSpeech(page);
  await page.goto("/marta/index.html");
});

test("sesja startuje od fiszki i pokazuje tłumaczenie dopiero po kliknięciu", async ({ page }) => {
  await seedMarta(page);
  expect(await currentView(page)).toBe("card");
  await expect(page.locator(".trans")).toHaveCount(0);
  await page.getByTestId("reveal").click();
  await expect(page.locator(".trans")).toBeVisible();
});

test("są trzy oceny, nie cztery", async ({ page }) => {
  await seedMarta(page);
  await page.getByTestId("reveal").click();
  await expect(page.locator(".grades .btn")).toHaveCount(3);
  await expect(page.locator('[data-grade="easy"]')).toHaveCount(0);
});

test("dzień to sześć nowych słówek, a gwiazdki pokazują postęp", async ({ page }) => {
  await seedMarta(page);
  await expect(page.getByTestId("count")).toHaveText("0 / 6");
  await expect(page.getByTestId("stars").locator("span")).toHaveCount(6);

  await page.getByTestId("reveal").click();
  await page.locator('[data-grade="good"]').click();
  await expect(page.getByTestId("count")).toHaveText("1 / 6");
  await expect(page.getByTestId("stars").locator("span.done")).toHaveCount(1);
});

test("nauka zaczyna się od form „be” i najbliższej rodziny", async ({ page }) => {
  await seedMarta(page);
  const shown: string[] = [];
  for (let i = 0; i < 6; i++) {
    shown.push((await page.locator("[data-view]").first().getAttribute("data-word")) ?? "");
    await page.getByTestId("reveal").click();
    await page.locator('[data-grade="good"]').click();
  }
  const start = ["am", "is", "are", "I am", "you are", "he is", "she is", "it is", "we are",
    "they are", "family", "mum", "dad"];
  for (const word of shown) expect(start).toContain(word);
});

test("po sześciu kartach jest pochwała i można poćwiczyć dalej", async ({ page }) => {
  await seedMarta(page);
  for (let i = 0; i < 6; i++) {
    await page.getByTestId("reveal").click();
    await page.locator('[data-grade="good"]').click();
  }
  expect(await currentView(page)).toBe("done");
  await expect(page.locator('[data-view="done"] b')).toContainText("Super!");
  await page.getByTestId("more").click();
  expect(await currentView(page)).toBe("card");
});

test("zakładka Słówka wypisuje cały materiał z kategoriami", async ({ page }) => {
  await page.getByRole("tab", { name: "Słówka" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(70);
  await expect(page.locator("h3.st-h").first()).toHaveText("Czasownik be");
  await expect(page.locator('tr[data-word="sister"]')).toContainText("siostra");
});

test("postęp Marty i taty nie mieszają się w jednej przeglądarce", async ({ page }) => {
  await seedMarta(page);
  await page.getByTestId("reveal").click();
  await page.locator('[data-grade="good"]').click();

  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys).toContain("marta.srs");
  expect(keys).not.toContain("it250.srs");

  await page.goto("/index.html");
  await expect(page.getByTestId("stat")).toContainText("Dziś 0 fiszek");
});

test("czytanie na głos da się wyłączyć i to się zapamiętuje", async ({ page }) => {
  await seedMarta(page);
  await page.getByRole("checkbox", { name: "Czytaj na głos" }).uncheck();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("checkbox", { name: "Czytaj na głos" })).not.toBeChecked();
});
