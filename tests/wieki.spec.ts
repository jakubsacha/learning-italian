import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/wieki/index.html");
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("wieki.")) localStorage.removeItem(k);
  });
  await page.reload({ waitUntil: "networkidle" });
});

/** Wiek z etykiety roku — liczony niezależnie od aplikacji. */
function expected(year: string): string {
  const m = /^(\d+) r\.( p\.n\.e\.)?$/.exec(year.trim());
  if (m === null) throw new Error(`dziwny rok: ${year}`);
  const n = Math.ceil(Number(m[1]) / 100);
  const romans: Record<number, string> = { 1: "I", 4: "IV", 5: "V", 9: "IX", 10: "X", 40: "XL", 50: "L" };
  let rest = n;
  let r = "";
  for (const v of [50, 40, 10, 9, 5, 4, 1]) while (rest >= v) ((r += romans[v]), (rest -= v));
  return `${r} w.${m[2] === undefined ? " n.e." : " p.n.e."}`;
}

test("dobra odpowiedź zgadza się z rachunkiem, daje gwiazdkę i wyjaśnienie z linijką", async ({ page }) => {
  const year = (await page.getByTestId("year").locator(".year").textContent()) ?? "";
  const ok = page.locator('.option[data-ok="1"]');
  await expect(ok).toHaveText(new RegExp(expected(year).replace(/\./g, "\\.") + "$"));
  await ok.click();
  await expect(page.getByTestId("verdict")).toContainText("Brawo");
  await expect(page.getByTestId("verdict").locator(".seg")).toHaveCount(3);
  await expect(page.getByTestId("verdict").locator(".seg.here")).toContainText(expected(year));
  await expect(page.getByTestId("stars")).toHaveText("⭐ 1");
  await expect(page.getByTestId("streak")).toHaveText("🔥 1");
});

test("zła odpowiedź: poprawna podświetlona, seria od zera", async ({ page }) => {
  await page.locator('.option[data-ok="0"]').first().click();
  await expect(page.locator(".option.no")).toHaveCount(1);
  await expect(page.locator(".option.ok")).toHaveCount(1);
  await expect(page.getByTestId("verdict")).toContainText("To ");
  await expect(page.getByTestId("streak")).toHaveText("🔥 0");
});

test("cała runda klawiaturą: wynik, gwiazdki i rekord serii", async ({ page }) => {
  for (let i = 1; i <= 10; i++) {
    await expect(page.getByTestId("progress")).toHaveText(`Pytanie ${i} z 10`);
    const n = await page.locator(".option").evaluateAll((els) => els.findIndex((e) => e.getAttribute("data-ok") === "1"));
    await page.keyboard.press(String(n + 1));
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("score")).toHaveText("Dobrze: 10 z 10");
  await expect(page.getByTestId("finish")).toContainText("Rekord serii: 10");
  await expect(page.getByTestId("stars")).toHaveText("⭐ 13");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("stars")).toHaveText("⭐ 13");
});

test("„Nasza era” nie pyta o p.n.e., „Też p.n.e.” dodaje odpowiedzi z drugiej ery; wybór zostaje", async ({ page }) => {
  for (let i = 0; i < 10; i++) {
    await expect(page.getByTestId("year").locator(".year")).not.toContainText("p.n.e.");
    await expect(page.locator(".option", { hasText: "p.n.e." })).toHaveCount(0);
    await page.locator(".option").first().click();
    await page.getByTestId("next").click();
  }
  await page.getByTestId("mode-both").click();
  await expect(page.getByTestId("progress")).toHaveText("Pytanie 1 z 10");
  await expect(page.locator(".option", { hasText: "p.n.e." })).not.toHaveCount(0);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("mode-both")).toHaveAttribute("aria-pressed", "true");
});

test("na telefonie nic nie wystaje poza ekran", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByTestId("mode-both").click();
  await page.locator('.option[data-ok="0"]').first().click();
  await page.locator("details.help summary").click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
