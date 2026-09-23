import { expect, test } from "@playwright/test";
import { deckWords, localMode, openTab, seed, stubSpeech } from "./helpers";

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
});

test("wszystkie zakładki mieszczą się bez ucinania i bez poziomego scrolla", async ({ page }) => {
  // Najszerszy napis w pasku to „TRUDNE 12" — licznik z dwiema cyframi.
  const words = await deckWords(page, 12);
  await seed(page, {
    srs: Object.fromEntries(words.map((w) => [w, { e: 1.5, i: 1, d: 99_999, r: 5, l: 4 }])),
  });
  await expect(page.getByRole("tab", { name: /^Trudne/ })).toHaveText("Trudne 12");
  for (const width of [320, 360, 390, 430, 700, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const state = await page.evaluate(() => ({
      clipped: [...document.querySelectorAll(".tabs button")]
        .filter((b) => b.scrollWidth > b.clientWidth + 1)
        .map((b) => b.textContent),
      horizontal: document.documentElement.scrollWidth > window.innerWidth,
    }));
    expect(state.clipped, `szerokość ${width}px`).toEqual([]);
    expect(state.horizontal, `szerokość ${width}px`).toBe(false);
  }
});

test("nauka jest nad panelem konta, a konto nad stopką", async ({ page }) => {
  const top = await page.evaluate(() => {
    const y = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top + scrollY;
    return { nauka: y(".sess"), konto: y(".sync"), stopka: y("footer") };
  });
  expect(top.nauka).toBeLessThan(top.konto);
  expect(top.konto).toBeLessThan(top.stopka);
});

test("przed odsłonięciem karty nie widać ani tłumaczenia, ani ocen", async ({ page }) => {
  await seed(page, { kind: "mix" });
  await expect(page.locator(".trans")).toHaveCount(0);
  await expect(page.locator(".grades")).toHaveCount(0);
  await expect(page.getByTestId("reveal")).toBeVisible();

  await page.keyboard.press("Space");
  await expect(page.locator(".trans")).toBeVisible();
  await expect(page.locator(".grades")).toBeVisible();
  await expect(page.getByTestId("reveal")).toHaveCount(0);
});

test("górny rząd to cztery zakładki nauki", async ({ page }) => {
  const tabs = await page.getByRole("tab").allTextContents();
  expect(tabs.slice(0, 4).map((t) => t.trim())).toEqual(["Nauka", "Powtórki", "Nowe", "Trudne"]);
});

test("wybrana zakładka przeżywa przeładowanie", async ({ page }) => {
  await openTab(page, "Powtórki");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("tab", { selected: true })).toHaveText("Powtórki");
});

test("stary zapis zakładki Fiszki wraca do zwykłej nauki", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("it250.kind", JSON.stringify("cards")));
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("tab", { selected: true })).toHaveText("Nauka");
});

test("zapisana zakładka Trudne wraca po przeładowaniu", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("it250.kind", JSON.stringify("hard")));
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("tab", { selected: true })).toHaveText(/^Trudne/);
});

test("motyw przeżywa przeładowanie", async ({ page }) => {
  await page.getByRole("button", { name: /motyw/ }).click();
  const chosen = await page.evaluate(() => document.documentElement.dataset["theme"]);
  await page.reload({ waitUntil: "networkidle" });
  expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe(chosen);
});

test("zakładka Słowa filtruje słownik", async ({ page }) => {
  await openTab(page, "Słowa");
  const all = await page.locator("tbody tr").count();
  expect(all).toBeGreaterThan(1000);
  await page.fill(".search", "kawa");
  const found = await page.locator("tbody tr").count();
  expect(found).toBeGreaterThan(0);
  expect(found).toBeLessThan(all);
  await expect(page.locator("tbody tr").first()).toContainText("kaw");
});
