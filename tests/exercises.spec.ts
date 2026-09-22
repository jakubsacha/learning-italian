import { expect, test } from "@playwright/test";
import {
  askedWord,
  clearSpoken,
  currentView,
  dayNumber,
  deckWords,
  localMode,
  openTab,
  reachView,
  seed,
  spoken,
  stubNoSpeech,
  stubSpeech,
} from "./helpers";

/** Słowa opanowane na tyle, że wchodzą wszystkie formy pytań. */
const mature = (words: readonly string[]) =>
  Object.fromEntries(
    words.map((w) => [w, { e: 2.5, i: 6, d: dayNumber(), r: 5, l: 0 }]),
  );

/** Słowa, przy których pojawiają się zdania z luką. */
const WITH_SENTENCES = ["caffè", "grazie", "ciao", "acqua", "conto", "pane", "vino", "casa"];

/** Duża, opanowana pula: formy losują się, więc musi starczyć kart na kilka podejść. */
const manyWords = async (page: import("@playwright/test").Page) => [
  ...new Set([...WITH_SENTENCES, ...(await deckWords(page, 120))]),
];

test.describe("formy ćwiczeń", () => {
  test.beforeEach(async ({ page }) => {
    await localMode(page);
    await stubSpeech(page);
    await page.goto("/index.html");
    await seed(page, { newDone: 30, srs: mature(await manyWords(page)) });
  });

  test("wpisywanie: trafienie, literówka i błąd są rozróżniane", async ({ page }) => {
    const answerWith = async (transform: (word: string) => string): Promise<string> => {
      await reachView(page, "type");
      const word = (await askedWord(page)).split("/")[0]!.trim();
      await page.fill('[data-test="type-input"]', transform(word));
      await page.click('[data-test="check"]');
      const verdict = (await page.locator(".verdict").textContent())!.trim();
      await page.click('[data-test="next"]');
      return verdict;
    };

    expect(await answerWith((w) => w)).toMatch(/^Dobrze!/);
    expect(await answerWith((w) => w.slice(0, -1) + "x")).toMatch(/^Prawie/);
    expect(await answerWith(() => "zupełnie źle")).toMatch(/^Poprawnie:/);
  });

  test("po sprawdzeniu pole i przycisk przestają reagować", async ({ page }) => {
    await reachView(page, "type");
    await page.fill('[data-test="type-input"]', "cokolwiek");
    await page.click('[data-test="check"]');
    await expect(page.locator('[data-test="type-input"]')).toBeDisabled();
    await expect(page.locator('[data-test="check"]')).toHaveCount(0);
  });

  test("ćwiczenie ze słuchu nie pokazuje włoskiego tekstu, ale je czyta", async ({ page }) => {
    await reachView(page, "listen");
    const word = await askedWord(page);
    const visible = (await page.locator('[data-view="listen"]').textContent())!;
    expect(visible).not.toContain(word);
    expect(await spoken(page)).toContain(word);
  });

  test("zdanie z luką pokazuje ukryte słowo dopiero po odpowiedzi", async ({ page }) => {
    // Luka wypada tylko przy słowach, do których jest zdanie — więc tylko takie
    // wpuszczamy do sesji i odnawiamy ją, aż forma się wylosuje.
    const refill = () => seed(page, { newDone: 30, srs: mature(WITH_SENTENCES) });
    await refill();
    await reachView(page, "cloze", { tries: 60, refill });
    const gap = await askedWord(page);
    await expect(page.locator('[data-view="cloze"] .ask-main')).not.toContainText(gap);
    await page.locator('.opt[data-ok="1"]').first().click();
    await expect(page.locator('[data-view="cloze"] .ask-main b')).toHaveText(gap);
  });

  test("po odpowiedzi w teście wyboru nie da się zmienić zdania", async ({ page }) => {
    await reachView(page, "choice");
    await page.locator('.opt[data-ok="0"]').first().click();
    await expect(page.locator(".verdict")).toContainText("Poprawnie:");
    for (const option of await page.locator(".opt").all()) {
      await expect(option).toBeDisabled();
    }
  });
});

test.describe("wymowa", () => {
  test.beforeEach(async ({ page }) => {
    await localMode(page);
    await stubSpeech(page);
    await page.goto("/index.html");
  });

  test("test wyboru czyta słowo po odpowiedzi, słuchanie go nie dubluje", async ({ page }) => {
    await seed(page, { newDone: 30, srs: mature(await manyWords(page)) });
    await reachView(page, "choice");
    const word = await askedWord(page);
    await clearSpoken(page);
    await page.locator('.opt[data-ok="1"]').first().click();
    expect(await spoken(page)).toEqual([word]);

    await page.click('[data-test="next"]');
    await reachView(page, "listen");
    await clearSpoken(page);
    await page.locator('.opt[data-ok="1"]').first().click();
    expect(await spoken(page)).toEqual([]);
  });

  test("wyłączona wymowa oznacza ciszę", async ({ page }) => {
    await seed(page, { kind: "cards", voice: false });
    await clearSpoken(page);
    await page.keyboard.press("Space");
    await page.keyboard.press("3");
    expect(await spoken(page)).toEqual([]);
  });

  test("przycisk głośnika czyta nawet przy wyłączonej wymowie", async ({ page }) => {
    await seed(page, { kind: "cards", voice: false });
    await clearSpoken(page);
    const word = await askedWord(page);
    await page.locator(".say").click();
    expect(await spoken(page)).toEqual([word]);
  });
});

test("bez głosu it-IT ćwiczenie ze słuchu w ogóle się nie proponuje", async ({ page }) => {
  await localMode(page);
  await stubNoSpeech(page);
  await page.goto("/index.html");
  await seed(page, { newDone: 30, srs: mature(await deckWords(page, 120)) });

  const views = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const view = await currentView(page);
    if (view === "done") break;
    views.add(view);
    if (view === "type") {
      await page.fill('[data-test="type-input"]', "cokolwiek");
      await page.click('[data-test="check"]');
      await page.click('[data-test="next"]');
      continue;
    }
    if (view === "card") {
      await page.keyboard.press("Space");
      await page.keyboard.press("3");
      continue;
    }
    await page.locator('.opt[data-ok="1"]').first().click();
    await page.click('[data-test="next"]');
  }
  expect([...views]).not.toContain("listen");
});

test.describe("zakładka Zdania", () => {
  test.beforeEach(async ({ page }) => {
    await localMode(page);
    await stubSpeech(page);
    await page.goto("/index.html");
    await openTab(page, "Zdania");
  });

  test("sprawdzenie blokuje klocki i czyta zdanie", async ({ page }) => {
    const panel = page.getByTestId("panel-sent");
    const tiles = panel.locator(".pool .tile");
    const count = await tiles.count();
    for (let i = 0; i < count; i++) await panel.locator(".pool .tile:not(.used)").first().click();

    await clearSpoken(page);
    await panel.getByRole("button", { name: "Sprawdź" }).click();

    await expect(panel.getByRole("button", { name: "Sprawdź" })).toBeDisabled();
    for (const tile of await panel.locator(".tile").all()) await expect(tile).toBeDisabled();
    expect((await spoken(page)).length).toBe(1);

    await panel.getByRole("button", { name: "Następne" }).click();
    await expect(panel.getByRole("button", { name: "Sprawdź" })).toBeEnabled();
  });

  test("uzupełnianie luki odsłania słowo i podaje wynik", async ({ page }) => {
    const panel = page.getByTestId("panel-sent");
    await panel.getByLabel("Rodzaj ćwiczenia").selectOption("gap");
    await panel.locator(".opt").first().click();
    await expect(panel.locator(".verdict")).toBeVisible();
    await expect(panel.locator(".gapline b")).not.toHaveText(" ");
  });
});
