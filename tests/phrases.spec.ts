import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { clearSpoken, dayKey, dayNumber, localMode, openTab, spoken, stubSpeech } from "./helpers";

const panel = (page: Page) => page.getByTestId("panel-phrases");
const view = (page: Page) =>
  panel(page).locator("[data-view]").first().getAttribute("data-view");
const asked = async (page: Page): Promise<string> =>
  (await panel(page).locator("[data-phrase]").first().getAttribute("data-phrase")) ?? "";

/** Stan rozmówek do localStorage; kwestie podajemy po włosku, bo to ich klucze. */
async function seedPhrases(
  page: Page,
  state: { known?: readonly string[]; reps?: number; newDone?: number; limit?: number } = {},
): Promise<void> {
  await page.evaluate(
    ([s, key, today]) => {
      const put = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
      put(
        "it250.phrases",
        Object.fromEntries((s.known ?? []).map((it) => [it, { e: 2.5, i: 3, d: today, r: s.reps ?? 3, l: 0 }])),
      );
      put("it250.phraseDay", { k: key, n: s.newDone ?? 0 });
      if (s.limit !== undefined) put("it250.phraseLimit", s.limit);
      localStorage.removeItem("it250.scene");
    },
    [state, dayKey(), dayNumber()] as const,
  );
  await page.reload({ waitUntil: "networkidle" });
  await openTab(page, "Rozmówki");
}

/** Odpowiada poprawnie na dowolną formę. */
async function answerRight(page: Page): Promise<void> {
  const kind = await view(page);
  const it = await asked(page);
  const p = panel(page);
  if (kind === "p-read" || kind === "p-speak") {
    await page.keyboard.press("Space");
    await page.keyboard.press("3");
  } else if (kind === "p-listen") {
    await p.locator('.opt[data-ok="1"]').click();
    await p.getByTestId("next").click();
  } else if (kind === "p-order") {
    for (const word of it.split(/\s+/)) {
      await p.getByTestId("pool").locator(".tile:not(.used)", { hasText: word }).first().click();
    }
    await p.getByTestId("check").click();
    await p.getByTestId("next").click();
  } else if (kind === "p-dictation") {
    await p.getByTestId("type-input").fill(it);
    await p.getByTestId("check").click();
    await p.getByTestId("next").click();
  } else {
    throw new Error("nie ma na co odpowiadać: " + kind);
  }
}

/** Odpowiada, aż wypadnie szukana forma. Po końcu sesji zaczyna ją od nowa. */
async function reach(page: Page, wanted: string, refill: () => Promise<void>): Promise<void> {
  for (let i = 0; i < 80; i++) {
    const kind = await view(page);
    if (kind === wanted) return;
    if (kind === "p-done" || kind === "p-menu") {
      await refill();
      await panel(page).getByTestId("practise").click();
      continue;
    }
    await answerRight(page);
  }
  throw new Error(`forma ${wanted} nie wypadła`);
}

/** Twoje kwestie z pierwszej sytuacji — w tej kolejności są w dialogu. */
const MINE = [
  "Mi scusi, non ho capito.",
  "Può ripetere, per favore?",
  "Può parlare più piano?",
  "Vengo dalla Polonia.",
  "Parlo solo un po' di italiano.",
  "Come si dice in italiano?",
  "Che cosa significa?",
  "Può scriverlo, per favore?",
];

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
});

test("zakładka Rozmówki zastępuje dawne Zdania", async ({ page }) => {
  const tabs = (await page.getByRole("tab").allTextContents()).map((t) => t.trim());
  expect(tabs).toContain("Rozmówki");
  expect(tabs).not.toContain("Zdania");
});

test("lista sytuacji zaczyna się od tej, w której się nie rozumie", async ({ page }) => {
  await seedPhrases(page);
  await expect(panel(page).locator(".scene-row")).toHaveCount(13);
  await expect(panel(page).locator(".scene-row .title").first()).toHaveText("Kiedy nie rozumiesz");
  await expect(panel(page).getByTestId("waiting")).toHaveText("Dziś czeka 5 kwestii");
});

test("nowe kwestie przychodzą w kolejności dialogu", async ({ page }) => {
  await seedPhrases(page);
  await panel(page).getByTestId("practise").click();
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    expect(await view(page)).toBe("p-read");
    seen.push(await asked(page));
    await answerRight(page);
  }
  expect(seen).toEqual(["Buongiorno, posso aiutarla?", "Mi scusi, non ho capito.", "Può ripetere, per favore?"]);
});

test("pierwsza karta pokazuje włoskie, a znaczenie dopiero po odsłonięciu", async ({ page }) => {
  await seedPhrases(page);
  await panel(page).getByTestId("practise").click();
  await expect(panel(page).locator(".trans")).toHaveCount(0);
  await page.keyboard.press("Space");
  await expect(panel(page).locator(".trans")).toHaveText("Dzień dobry, mogę panu/pani pomóc?");
  await expect(panel(page).locator(".grades .btn")).toHaveCount(4);
});

test("po dziennej porcji jest koniec i można dobrać kilka nowych", async ({ page }) => {
  await seedPhrases(page, { limit: 3 });
  await panel(page).getByTestId("practise").click();
  for (let i = 0; i < 3; i++) await answerRight(page);
  expect(await view(page)).toBe("p-done");
  await panel(page).getByTestId("more").click();
  expect(await view(page)).toBe("p-read");
});

test("odpowiedzi w rozmówkach liczą się do dziennego wyniku", async ({ page }) => {
  await seedPhrases(page, { limit: 3 });
  await panel(page).getByTestId("practise").click();
  for (let i = 0; i < 3; i++) await answerRight(page);
  const today = await page.evaluate((k) => JSON.parse(localStorage["it250.days"] as string)[k] as number, dayKey());
  expect(today).toBe(3);
});

test("postęp kwestii przeżywa przeładowanie", async ({ page }) => {
  await seedPhrases(page);
  await panel(page).getByTestId("practise").click();
  await answerRight(page);
  await page.reload({ waitUntil: "networkidle" });
  await openTab(page, "Rozmówki");
  await expect(panel(page).locator(".scene-row .count").first()).toContainText("1/13");
});

test("wybrana sytuacja daje nowe kwestie jako pierwsza", async ({ page }) => {
  await seedPhrases(page);
  await panel(page).locator('.scene-row[data-scene="bar"]').click();
  await panel(page).getByTestId("learn").click();
  expect(await asked(page)).toBe("Buongiorno, cosa prende?");
});

test("w scence swoje kwestie widać po polsku, a włoskie po kliknięciu i ze słuchu", async ({
  page,
}) => {
  await seedPhrases(page);
  await panel(page).locator('.scene-row[data-scene="bar"]').click();
  const mine = panel(page).locator('.line.ty[data-phrase="Un caffè e un cornetto, per favore."]');
  await expect(mine.locator(".main")).toHaveText("Poproszę kawę i rogalika.");
  await expect(mine.locator(".sub")).toHaveCount(0);
  await clearSpoken(page);
  await mine.locator(".bubble").click();
  await expect(mine.locator(".sub")).toHaveText("Un caffè e un cornetto, per favore.");
  expect(await spoken(page)).toEqual(["Un caffè e un cornetto, per favore."]);

  const theirs = panel(page).locator('.line.oni[data-phrase="Buongiorno, cosa prende?"]');
  await expect(theirs.locator(".main")).toHaveText("Buongiorno, cosa prende?");
});

test.describe("formy ćwiczeń", () => {
  const refill = (page: Page) => () => seedPhrases(page, { known: MINE, newDone: 99 });

  test("rozsypanka: dobra kolejność zalicza, zła pokazuje poprawne zdanie", async ({ page }) => {
    await refill(page)();
    await panel(page).getByTestId("practise").click();
    await reach(page, "p-order", refill(page));
    const it = await asked(page);
    const words = it.split(/\s+/);
    // najpierw celowo źle: od końca
    for (const word of [...words].reverse()) {
      await panel(page).getByTestId("pool").locator(".tile:not(.used)", { hasText: word }).first().click();
    }
    await panel(page).getByTestId("check").click();
    await expect(panel(page).locator(".verdict")).toHaveText("Poprawnie: " + it);
    await expect(panel(page).locator(".tile").first()).toBeDisabled();

    await panel(page).getByTestId("next").click();
    await reach(page, "p-order", refill(page));
    await answerRight(page);
  });

  test("dyktando: literówka to jeszcze nie błąd", async ({ page }) => {
    await refill(page)();
    await panel(page).getByTestId("practise").click();
    await reach(page, "p-dictation", refill(page));
    const it = await asked(page);
    await expect(panel(page).locator('[data-view="p-dictation"]')).not.toContainText(it);
    await panel(page).getByTestId("type-input").fill(it.replace(/[aeiou]/, "x"));
    await panel(page).getByTestId("check").click();
    await expect(panel(page).locator(".verdict")).toContainText("Prawie");
  });

  test("mówienie: polskie na górze, włoskie i jego wymowa po odsłonięciu", async ({ page }) => {
    await refill(page)();
    await panel(page).getByTestId("practise").click();
    await reach(page, "p-speak", refill(page));
    const it = await asked(page);
    await expect(panel(page).locator(".phrase-main")).not.toHaveText(it);
    await clearSpoken(page);
    await page.keyboard.press("Space");
    await expect(panel(page).locator(".trans.it")).toHaveText(it);
    expect(await spoken(page)).toContain(it);
  });

  test("słuchanie nie pokazuje tekstu, zanim odpowiesz", async ({ page }) => {
    await refill(page)();
    await panel(page).getByTestId("practise").click();
    await reach(page, "p-listen", refill(page));
    const it = await asked(page);
    await expect(panel(page).locator('[data-view="p-listen"]')).not.toContainText(it);
    expect(await spoken(page)).toContain(it);
  });
});

test("przełączenie zakładki nie przerywa rozpoczętych rozmówek", async ({ page }) => {
  await seedPhrases(page);
  await panel(page).getByTestId("practise").click();
  await answerRight(page);
  const before = await asked(page);
  await openTab(page, "Nauka");
  await openTab(page, "Rozmówki");
  expect(await asked(page)).toBe(before);
  await expect(panel(page).getByTestId("count")).toHaveText("1 / 5");
});

test("filtr kategorii słów nie pokazuje się w rozmówkach", async ({ page }) => {
  await expect(page.locator("details.filters")).toBeVisible();
  await openTab(page, "Rozmówki");
  await expect(page.locator("details.filters")).toBeHidden();
});
