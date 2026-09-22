import { expect, test } from "@playwright/test";
import { localMode, stubSpeech } from "./helpers";

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
});

test("słownictwo jest spójne: bez duplikatów i bez braków", async ({ page }) => {
  const report = await page.evaluate(() => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    const incomplete: string[] = [];
    for (const w of DATA.words) {
      const key = w.it.toLowerCase().trim();
      if (seen.has(key)) duplicates.push(w.it);
      seen.add(key);
      if (!w.it || !w.pr || !w.pl || !w.c || !w.l || !w.o) incomplete.push(w.it);
    }
    const orders = DATA.words.map((w) => w.o).sort((a, b) => a - b);
    const gapsMissing = SENT.filter((s) => !s.it.toLowerCase().includes(s.gap.toLowerCase()));
    return {
      duplicates,
      incomplete,
      count: DATA.words.length,
      ordersUnique: new Set(orders).size === orders.length,
      ordersDense: orders[0] === 1 && orders.at(-1) === orders.length,
      gapsMissing: gapsMissing.map((s) => s.gap),
      sentences: SENT.length,
    };
  });
  expect(report.duplicates).toEqual([]);
  expect(report.incomplete).toEqual([]);
  expect(report.gapsMissing).toEqual([]);
  expect(report.ordersUnique).toBe(true);
  expect(report.ordersDense).toBe(true);
  expect(report.count).toBeGreaterThan(1900);
  expect(report.sentences).toBeGreaterThan(180);
});

test("pole włoskie nie zawiera polskich dopisków", async ({ page }) => {
  const polluted = await page.evaluate(() =>
    DATA.words.filter((w) => /[ąćęłńóśźż]/i.test(w.it)).map((w) => w.it));
  expect(polluted).toEqual([]);
});

test("kolejność wprowadzania zaczyna się od zwrotów grzecznościowych", async ({ page }) => {
  const firstTen = await page.evaluate(() =>
    [...DATA.words].sort((a, b) => a.o - b.o).slice(0, 10).map((w) => w.c));
  expect(new Set(firstTen)).toEqual(new Set(["Powitania i grzeczność"]));
});

test("stary format postępu (0–3) migruje na odstępy", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("it250.box", JSON.stringify({ ciao: 3, grazie: 1, no: 0 }));
  });
  await page.reload({ waitUntil: "networkidle" });
  const migrated = await page.evaluate(() => JSON.parse(localStorage["it250.srs"]));
  expect(Object.keys(migrated).sort()).toEqual(["ciao", "grazie", "no"]);
  expect(migrated.ciao.i).toBeGreaterThan(migrated.grazie.i);
  expect(migrated.no.i).toBe(0);
});
