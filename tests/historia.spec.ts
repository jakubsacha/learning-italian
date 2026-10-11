import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { dayKey, dayNumber } from "./helpers";

const learn = (page: Page) => page.getByTestId("panel-learn");
const asked = (page: Page) => learn(page).locator("[data-fact]").first().getAttribute("data-fact");

async function seedHistory(
  page: Page,
  state: { known?: readonly string[]; newDone?: number; scope?: number | "all" } = {},
): Promise<void> {
  await page.evaluate(
    ([s, key, today]) => {
      const put = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
      put(
        "historia.facts",
        Object.fromEntries((s.known ?? []).map((q) => [q, { e: 2.5, i: 3, d: today, r: 3, l: 0 }])),
      );
      put("historia.day", { k: key, n: s.newDone ?? 0 });
      put("historia.scope", s.scope ?? "all");
      localStorage.removeItem("historia.days");
    },
    [state, dayKey(), dayNumber()] as const,
  );
  await page.reload({ waitUntil: "networkidle" });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/historia/index.html");
});

test("najważniejsze fakty idą pierwsze, w kolejności książki", async ({ page }) => {
  await seedHistory(page, { scope: 1 });
  expect(await asked(page)).toBe("Jak nazywała się strategia walki, którą Niemcy zastosowali w ataku na Polskę?");
  await page.keyboard.press("Space");
  await expect(learn(page).locator(".trans")).toHaveText("wojna błyskawiczna (Blitzkrieg)");
  await page.keyboard.press("3");
  expect(await asked(page)).toBe("Kiedy wybuchła II wojna światowa?");
  await expect(learn(page).locator(".cat")).toContainText("★");
});

test("są trzy oceny, a dzień to dziesięć nowych faktów", async ({ page }) => {
  await seedHistory(page);
  await expect(learn(page).getByTestId("count")).toHaveText("0 / 10");
  await learn(page).getByTestId("reveal").click();
  await expect(learn(page).locator(".grades .btn")).toHaveCount(3);
});

test("test ABCD daje odpowiedzi tego samego rodzaju", async ({ page }) => {
  await seedHistory(page, { known: ["Kiedy wybuchła II wojna światowa?"], newDone: 99 });
  // forma się losuje — przeładowujemy, aż wypadnie test
  for (let i = 0; i < 30 && (await learn(page).locator('[data-view="choice"]').count()) === 0; i++) {
    await page.reload({ waitUntil: "networkidle" });
  }
  const options = await learn(page).locator(".opt").allTextContents();
  expect(options).toHaveLength(4);
  for (const o of options) expect(o).toMatch(/19(39|40|41) r\.$/);
  await learn(page).locator('.opt[data-ok="1"]').click();
  await expect(learn(page).locator(".verdict")).toContainText("Dobrze! 1 września 1939 r.");
});

test("po dziennej porcji można uczyć się dalej", async ({ page }) => {
  await seedHistory(page, { newDone: 10 });
  await expect(learn(page).locator('[data-view="done"] b')).toHaveText("Na dziś nic nie czeka");
  await learn(page).getByTestId("more").click();
  await expect(learn(page).locator('[data-view="card"]')).toBeVisible();
});

test("postęp przeżywa przeładowanie i liczy się do wyniku dnia", async ({ page }) => {
  await seedHistory(page);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Space");
    await page.keyboard.press("3");
  }
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("stat")).toContainText("Dziś 3 odpowiedzi");
  await expect(learn(page).getByTestId("count")).toHaveText("0 / 7");
});

test("zmiana zakresu ogranicza materiał do jednego tematu", async ({ page }) => {
  await seedHistory(page);
  await page.getByLabel("Zakres materiału").selectOption("2");
  expect(await asked(page)).toBe("Między jakimi państwami toczyła się wojna zimowa?");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByLabel("Zakres materiału")).toHaveValue("2");
});

test("oś czasu: po ułożeniu jest werdykt, wynik i następna runda", async ({ page }) => {
  await page.getByRole("tab", { name: "Oś czasu" }).click();
  const panel = page.getByTestId("panel-timeline");
  const labels = await panel.getByTestId("pool").locator(".tile").allTextContents();
  expect(labels).toHaveLength(4);
  // celowo źle: odwrotnie do kolejności na ekranie, aż się nie zgodzi z chronologią
  for (const l of [...labels].reverse()) await panel.getByTestId("pool").getByText(l.trim(), { exact: true }).click();
  const verdict = await panel.locator(".verdict").textContent();
  expect(verdict).toMatch(/Brawo|Dobra kolejność/);
  await expect(panel.getByTestId("score")).toContainText("z 1");
  await panel.getByTestId("next").click();
  await expect(panel.getByTestId("pool").locator(".tile")).toHaveCount(4);
});

test("ściąga ma cały materiał, a filtr zostawia tylko pogrubione", async ({ page }) => {
  await page.getByRole("tab", { name: "Ściąga" }).click();
  const panel = page.getByTestId("panel-notes");
  const all = await panel.locator(".note").count();
  expect(all).toBeGreaterThan(100);
  await panel.getByLabel(/Tylko najważniejsze/).check();
  const key = await panel.locator(".note").count();
  expect(key).toBeLessThan(all);
  expect(await panel.locator(".note:not(.key)").count()).toBe(0);
  await expect(panel.locator('[data-fact="Kto dowodził obroną Westerplatte?"] dd')).toHaveText("major Henryk Sucharski");
});

test("historia nie miesza się z nauką włoskiego", async ({ page }) => {
  await seedHistory(page);
  await page.keyboard.press("Space");
  await page.keyboard.press("3");
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.some((k) => k.startsWith("it250."))).toBe(false);
});

test("na telefonie nic nie wystaje poza ekran", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const tab of ["Nauka", "Oś czasu", "Ściąga"]) {
    await page.getByRole("tab", { name: tab }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), tab).toBe(false);
  }
});
