import { expect, test } from "@playwright/test";
import { localMode, openTab, seed, stubSpeech } from "./helpers";

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
});

test("wszystkie zakładki mieszczą się bez ucinania i bez poziomego scrolla", async ({ page }) => {
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

test("pierwsze trzy zakładki to Nauka, Utrwalanie i Nowe słowa", async ({ page }) => {
  const tabs = await page.getByRole("tab").allTextContents();
  expect(tabs.slice(0, 3).map((t) => t.trim())).toEqual(["Nauka", "Utrwalanie", "Nowe słowa"]);
});

test("wybrana zakładka przeżywa przeładowanie", async ({ page }) => {
  await openTab(page, "Utrwalanie");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("tab", { selected: true })).toHaveText("Utrwalanie");
});

test("stary zapis zakładki Fiszki albo Trudne wraca do zwykłej nauki", async ({ page }) => {
  for (const old of ["cards", "hard"]) {
    await page.evaluate((k) => localStorage.setItem("it250.kind", JSON.stringify(k)), old);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("tab", { selected: true })).toHaveText("Nauka");
  }
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
