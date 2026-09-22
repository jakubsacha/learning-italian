import { expect, test } from "@playwright/test";
import { cloudMode, dayKey, dayNumber, localMode, seed, stubSpeech } from "./helpers";

const MONIKA = {
  id: "u1",
  email: "monika@learning-italian.app",
  password: "haslo123",
  user_metadata: { username: "monika" },
};

const login = async (page: import("@playwright/test").Page, how: "Zaloguj" | "Załóż konto") => {
  await page.getByRole("button", { name: "Zaloguj", exact: true }).first().click();
  await page.fill("#auth-user", "monika");
  await page.fill("#auth-pass", "haslo123");
  await page.locator("dialog").getByRole("button", { name: how, exact: true }).click();
};

test.beforeEach(async ({ page }) => {
  await stubSpeech(page);
});

test("bez konfiguracji aplikacja działa lokalnie i nie proponuje logowania", async ({ page }) => {
  await localMode(page);
  await page.goto("/index.html");
  await expect(page.locator(".sync-who")).toContainText("Tryb lokalny");
  await expect(page.getByRole("button", { name: "Zaloguj", exact: true })).toHaveCount(0);
});

test("rejestracja zajmuje nazwę i zabiera ze sobą dotychczasowy postęp", async ({ page }) => {
  const db = { users: [] as unknown[], rows: [] as unknown[] };
  await cloudMode(page, db);
  await page.goto("/index.html");
  await seed(page, { kind: "mix" });

  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Space");
    await page.keyboard.press("3");
  }
  await login(page, "Załóż konto");

  await expect(page.locator(".sync-who")).toContainText("Zalogowano jako");
  const row = await page.evaluate(
    () => window.__DB!.rows[0] as { srs: object; days: object },
  );
  expect(Object.keys(row.srs).length).toBe(3);
  expect(Object.keys(row.days)).toEqual([new Date().toISOString().slice(0, 10)]);
});

test("zajęta nazwa i złe hasło dają zrozumiałe komunikaty", async ({ page }) => {
  await cloudMode(page, { users: [MONIKA], rows: [] });
  await page.goto("/index.html");

  await page.getByRole("button", { name: "Zaloguj", exact: true }).first().click();
  await page.fill("#auth-user", "Monika");
  await page.fill("#auth-pass", "inne123");
  await page.locator("dialog").getByRole("button", { name: "Załóż konto" }).click();
  await expect(page.locator(".auth-err")).toContainText("jest już zajęta");

  await page.fill("#auth-pass", "zlehaslo");
  await page.locator("dialog").getByRole("button", { name: "Zaloguj", exact: true }).click();
  await expect(page.locator(".auth-err")).toContainText("Zła nazwa lub hasło");
});

test("wspólny cel sumuje obie osoby i zna serię", async ({ page }) => {
  const today = dayKey();
  const rows = [
    { user_id: "u1", username: "monika", srs: {}, days: { [today]: 18, [dayKey(-1)]: 25 }, known: 41 },
    { user_id: "u2", username: "jakub", srs: {}, days: { [today]: 9, [dayKey(-1)]: 20 }, known: 58 },
  ];
  await cloudMode(page, { users: [MONIKA], rows }, 40);
  await page.goto("/index.html");
  await login(page, "Zaloguj");

  await expect(page.locator(".goal-label")).toHaveText("27 / 40 fiszek — brakuje 13");
  await expect(page.locator(".goal-streak")).toContainText("Wspólna seria: 1");
  await expect(page.locator(".board-row")).toHaveCount(2);
  await expect(page.locator(".board-row.me .nick")).toHaveText("monika");
});

test("cel wyrobiony jest oznaczony osobno", async ({ page }) => {
  const today = dayKey();
  const rows = [
    { user_id: "u1", username: "monika", srs: {}, days: { [today]: 28 }, known: 41 },
    { user_id: "u2", username: "jakub", srs: {}, days: { [today]: 19 }, known: 58 },
  ];
  await cloudMode(page, { users: [MONIKA], rows }, 40);
  await page.goto("/index.html");
  await login(page, "Zaloguj");
  await expect(page.locator(".goal")).toHaveClass(/hit/);
  await expect(page.locator(".goal-label")).toContainText("Cel zrobiony: 47 / 40");
});

test("logowanie na swoim urządzeniu scala postęp, na cudzym wygrywa serwer", async ({ page }) => {
  const remote = {
    user_id: "u1",
    username: "monika",
    srs: { ciao: { e: 2.5, i: 21, d: dayNumber(21), r: 6, l: 0 } },
    days: { [dayKey(-1)]: 9 },
    known: 1,
  };

  // to samo urządzenie: scalenie, lokalne słowo zostaje
  await cloudMode(page, { users: [MONIKA], rows: [structuredClone(remote)] });
  await page.goto("/index.html");
  await seed(page, { srs: { no: { e: 2.5, i: 3, d: dayNumber(), r: 2, l: 0 } } });
  await page.evaluate(() => localStorage.setItem("it250.owner", JSON.stringify("monika")));
  await login(page, "Zaloguj");
  await expect(page.locator(".sync-who")).toContainText("Zalogowano");
  const merged = await page.evaluate(() =>
    Object.keys(JSON.parse(localStorage["it250.srs"] as string) as object).sort(),
  );
  expect(merged).toEqual(["ciao", "no"]);

  // cudze urządzenie: stan z serwera zastępuje lokalny
  await page.evaluate(() => {
    localStorage.setItem("it250.owner", JSON.stringify("ktos-inny"));
    localStorage.setItem("it250.srs", JSON.stringify({ pizza: { e: 2.5, i: 3, d: 0, r: 2, l: 0 } }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await login(page, "Zaloguj");
  await expect(page.locator(".sync-who")).toContainText("Zalogowano");
  const replaced = await page.evaluate(() =>
    Object.keys(JSON.parse(localStorage["it250.srs"] as string) as object),
  );
  expect(replaced).not.toContain("pizza");
});
