import { expect, test } from "@playwright/test";
import {
  clearSpoken, currentView, dayNumber, localMode, seed, spoken, stubNoSpeech, stubSpeech,
} from "./helpers";

const mature = (words: string[]) =>
  Object.fromEntries(words.map((w) => [w, { e: 2.5, i: 6, d: dayNumber(), r: 5, l: 0 }]));

test.describe("formy ćwiczeń", () => {
  test.beforeEach(async ({ page }) => {
    await localMode(page);
    await stubSpeech(page);
    await page.goto("/index.html");
  });

  test("trudniejsze formy pojawiają się dopiero przy opanowanym słowie", async ({ page }) => {
    const draws = await page.evaluate(() => {
      const word = DATA.words[5]!;
      const seenForms = (reps: number) => {
        srs[word.it] = { e: 2.5, i: 10, d: 0, r: reps, l: 0 };
        const set = new Set<string>();
        for (let i = 0; i < 300; i++) set.add(exerciseFor(word));
        return [...set].sort();
      };
      return { fresh: seenForms(0), one: seenForms(1), three: seenForms(3) };
    });
    expect(draws.fresh).toEqual(["card"]);
    expect(draws.one).not.toContain("type");
    expect(draws.three).toContain("type");
  });

  test("wpisywanie: trafienie, literówka i błąd są rozróżniane", async ({ page }) => {
    await seed(page, { srs: mature(["pane"]), newDone: 10 });
    await page.evaluate(() => {
      current = DATA.words.find((w) => w.it === "pane")!;
      mode = "type";
      showView("type");
      renderTypeStep();
    });

    const check = async (typed: string) => {
      await page.evaluate(() => { settled = false; showView("type"); renderTypeStep(); });
      await page.fill("#xt-in", typed);
      await page.click("#xt-check");
      return (await page.textContent("#xt-verdict"))!.trim();
    };
    expect(await check("pane")).toMatch(/^Dobrze!/);
    expect(await check("pana")).toMatch(/^Prawie/);
    expect(await check("zupełnie źle")).toMatch(/^Poprawnie:/);
  });

  test("ćwiczenie ze słuchu nie pokazuje włoskiego tekstu", async ({ page }) => {
    await seed(page, { srs: mature(["vino"]), newDone: 10 });
    await page.evaluate(() => {
      current = DATA.words.find((w) => w.it === "vino")!;
      mode = "listen";
      showView("listen");
      renderListenStep();
    });
    const visible = (await page.textContent("#x-listen"))!;
    expect(visible).not.toContain("vino");
    expect(await spoken(page)).toContain("vino");
  });

  test("luka w zdaniu powstaje też przy słowach z akcentem", async ({ page }) => {
    const split = await page.evaluate(() => ({
      accented: splitGap("Mi piace molto questa città.", "città"),
      grave: splitGap("Un caffè, per favore.", "caffè"),
    }));
    expect(split.accented).toEqual(["Mi piace molto questa ", "."]);
    expect(split.grave).toEqual(["Un ", ", per favore."]);
  });
});

test.describe("wymowa", () => {
  test("quiz czyta słowo po odpowiedzi, słuchanie nie dubluje", async ({ page }) => {
    await localMode(page);
    await stubSpeech(page);
    await page.goto("/index.html");
    await seed(page, { srs: mature(["conto"]), newDone: 10 });

    const afterAnswer = await page.evaluate(() => {
      current = DATA.words.find((w) => w.it === "conto")!;
      settled = false; mode = "quiz-it-pl"; showView("quiz"); renderQuizStep("quiz-it-pl");
      window.__spoken = [];
      (document.querySelector('#xq-opts .opt[data-ok="1"]') as HTMLElement).click();
      return window.__spoken!.slice();
    });
    expect(afterAnswer).toEqual(["conto"]);

    const afterListen = await page.evaluate(() => {
      current = DATA.words.find((w) => w.it === "conto")!;
      settled = false; mode = "listen"; showView("listen"); renderListenStep();
      window.__spoken = [];
      (document.querySelector('#xl-opts .opt[data-ok="1"]') as HTMLElement).click();
      return window.__spoken!.slice();
    });
    expect(afterListen).toEqual([]);
  });

  test("wyłączona wymowa oznacza ciszę", async ({ page }) => {
    await localMode(page);
    await stubSpeech(page);
    await page.goto("/index.html");
    await seed(page, { srs: mature(["mare"]), newDone: 10, voice: false });
    await clearSpoken(page);
    const said = await page.evaluate(() => {
      current = DATA.words.find((w) => w.it === "mare")!;
      settled = false; mode = "quiz-it-pl"; showView("quiz"); renderQuizStep("quiz-it-pl");
      window.__spoken = [];
      (document.querySelector('#xq-opts .opt[data-ok="1"]') as HTMLElement).click();
      return window.__spoken!.slice();
    });
    expect(said).toEqual([]);
  });

  test("bez głosu it-IT ćwiczenie ze słuchu w ogóle się nie proponuje", async ({ page }) => {
    await localMode(page);
    await stubNoSpeech(page);
    await page.goto("/index.html");
    await seed(page, { srs: mature(["casa"]), newDone: 10 });
    expect(await page.evaluate(() => canListen())).toBe(false);
    const forms = await page.evaluate(() => {
      const word = DATA.words.find((w) => w.it === "casa")!;
      const set = new Set<string>();
      for (let i = 0; i < 200; i++) set.add(exerciseFor(word));
      return [...set];
    });
    expect(forms).not.toContain("listen");
  });
});

test.describe("zakładka Zdania", () => {
  test("sprawdzenie blokuje przycisk i klocki oraz czyta zdanie", async ({ page }) => {
    await localMode(page);
    await stubSpeech(page);
    await page.goto("/index.html");
    await page.click('[data-tab="sent"]');
    await page.selectOption("#s-mode", "order");

    const tiles = await page.locator("#s-pool .tile").count();
    for (let i = 0; i < tiles; i++) await page.locator("#s-pool .tile:not(.used)").first().click();
    await clearSpoken(page);
    await page.click("#s-check");

    await expect(page.locator("#s-check")).toBeDisabled();
    const allDisabled = await page.evaluate(() =>
      [...document.querySelectorAll("#s-slot .tile, #s-pool .tile")]
        .every((t) => (t as HTMLButtonElement).disabled));
    expect(allDisabled).toBe(true);
    expect((await spoken(page)).length).toBe(1);

    // Playwright nie kliknie wyłączonego przycisku, więc wołamy click() wprost:
    // sprawdzamy, że nawet wymuszone kliknięcie nie doliczy drugiego wyniku.
    const before = await page.evaluate(() => sDone);
    await page.evaluate(() => (document.querySelector("#s-check") as HTMLButtonElement).click());
    expect(await page.evaluate(() => sDone)).toBe(before);

    await page.click("#s-next");
    await expect(page.locator("#s-check")).toBeEnabled();
  });
});
