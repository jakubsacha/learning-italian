import { expect, test } from "@playwright/test";
import { localMode, seed, stubSpeech } from "./helpers";

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
});

test("wszystkie zakładki mieszczą się bez ucinania i bez poziomego scrolla", async ({ page }) => {
  for (const width of [320, 360, 390, 430, 700]) {
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
    return { nauka: y("#p-flash"), konto: y("#sync"), stopka: y("footer") };
  });
  expect(top.nauka).toBeLessThan(top.konto);
  expect(top.konto).toBeLessThan(top.stopka);
});

test("przed odsłonięciem karty nie widać ani tłumaczenia, ani ocen", async ({ page }) => {
  await seed(page, { kind: "cards" });
  await expect(page.locator("#f-trans")).toBeHidden();
  await expect(page.locator("#f-actions")).toBeHidden();
  await expect(page.locator("#f-reveal")).toBeVisible();

  await page.keyboard.press("Space");
  await expect(page.locator("#f-trans")).toBeVisible();
  await expect(page.locator("#f-actions")).toBeVisible();
  await expect(page.locator("#f-reveal")).toBeHidden();
});

test("Fiszki podają wyłącznie karty, Nauka miesza formy", async ({ page }) => {
  await seed(page, { kind: "cards" });
  const modes = new Set<string>();
  for (let i = 0; i < 8; i++) {
    modes.add(await page.evaluate(() => mode));
    await page.keyboard.press("Space");
    await page.keyboard.press("3");
  }
  expect([...modes]).toEqual(["card"]);

  await page.click('[data-tab="flash"]');
  expect(await page.evaluate(() => kind)).toBe("mix");
});

test("wybrana zakładka przeżywa przeładowanie", async ({ page }) => {
  await page.click('[data-tab="cards"]');
  await page.reload({ waitUntil: "networkidle" });
  const active = await page.evaluate(() =>
    document.querySelector('[role="tab"][aria-selected="true"]')!.textContent);
  expect(active).toBe("Fiszki");
});
