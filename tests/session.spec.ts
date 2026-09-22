import { expect, test } from "@playwright/test";
import { answerCorrectly, currentView, dayNumber, localMode, seed, stubSpeech } from "./helpers";

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
});

test("nowy użytkownik dostaje najczęstsze słowa, zaczynając od zwrotów grzecznościowych", async ({ page }) => {
  await seed(page, { kind: "cards" });
  const words: string[] = [];
  for (let i = 0; i < 6; i++) {
    words.push((await page.textContent("#f-word"))!.trim());
    await answerCorrectly(page);
  }
  const greetings = ["ciao", "sì", "no", "grazie", "prego", "salve", "per favore",
    "va bene", "a domani", "mi dispiace", "come stai?", "buongiorno", "arrivederci",
    "buonasera", "buonanotte", "piacere", "scusi / scusa"];
  for (const w of words) expect(greetings).toContain(w);
});

test("licznik pokazuje karty, nie odpowiedzi: „Nie wiem” nie zawyża sumy", async ({ page }) => {
  await seed(page, { kind: "cards" });
  await expect(page.locator("#f-of")).toHaveText("0 / 10");

  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Space");
    await page.keyboard.press("1"); // Nie wiem
    await expect(page.locator("#f-of")).toHaveText("0 / 10");
    await expect(page.locator("#f-left")).toHaveText("Zostało 10 kart");
  }

  await answerCorrectly(page);
  await expect(page.locator("#f-of")).toHaveText("1 / 10");
  await expect(page.locator("#f-left")).toHaveText("Zostało 9 kart");
});

test("dzienny limit nowych słów jest przestrzegany", async ({ page }) => {
  await seed(page, { kind: "cards", limit: 5 });
  await expect(page.locator("#f-of")).toHaveText("0 / 5");
  for (let i = 0; i < 5; i++) await answerCorrectly(page);
  expect(await currentView(page)).toBe("done");
  await expect(page.locator("#f-done-title")).toHaveText(/Na dziś zrobione/);
});

test("skład kolejki jest rozpisany na powtórki, trudne i nowe", async ({ page }) => {
  const today = dayNumber();
  await seed(page, {
    kind: "cards",
    newDone: 8,
    srs: {
      grazie: { e: 2.5, i: 5, d: today, r: 4, l: 0 },
      ciao: { e: 2.5, i: 5, d: today, r: 4, l: 0 },
      sì: { e: 1.8, i: 30, d: today + 30, r: 9, l: 5 },
    },
  });
  await expect(page.locator("#f-mix")).toHaveText("2 powtórki · 1 trudne słowo · 2 nowe słowa");
});

test("następnego dnia wracają powtórki, a limit nowych się zeruje", async ({ page }) => {
  const today = dayNumber();
  await seed(page, {
    kind: "cards",
    newDone: 10,
    srs: Object.fromEntries(
      ["ciao", "sì", "no"].map((w) => [w, { e: 2.5, i: 1, d: today, r: 1, l: 0 }]),
    ),
  });
  // dzień zapisany jako wczorajszy => aplikacja musi go przewinąć
  await page.evaluate(() => {
    const key = new Date(Date.now() - 86_400_000 - new Date().getTimezoneOffset() * 60_000)
      .toISOString().slice(0, 10);
    localStorage.setItem("it250.day", JSON.stringify({ k: key, n: 10 }));
  });
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.locator("#f-left")).toHaveText("Zostało 13 kart"); // 3 powtórki + 10 nowych
  expect(await page.evaluate(() => JSON.parse(localStorage["it250.day"]).n)).toBe(0);
});

test("po wyczerpaniu kolejki można uczyć się poza planem", async ({ page }) => {
  await seed(page, { kind: "cards", limit: 5 });
  for (let i = 0; i < 5; i++) await answerCorrectly(page);
  expect(await currentView(page)).toBe("done");
  await page.click("#f-extra");
  expect(await currentView(page)).toBe("card");
});
