import type { Page } from "@playwright/test";

/**
 * Wspólne narzędzia testów. Zaczepienia w interfejsie są dwa: `data-view` mówi,
 * które ćwiczenie jest na ekranie, a `data-word` / `data-ok` podają poprawną
 * odpowiedź, żeby test mógł ją udzielić. Poza tym testy klikają to samo, co
 * człowiek — nie zaglądają do środka aplikacji.
 */

/** Dzień jako liczba dni od epoki, tak jak liczy to aplikacja (czas lokalny). */
export const dayNumber = (offset = 0): number =>
  Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / 86_400_000) + offset;

/** Klucz dnia "RRRR-MM-DD" w czasie lokalnym. */
export const dayKey = (offset = 0): string =>
  new Date(Date.now() + offset * 86_400_000 - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);

export type Review = { e: number; i: number; d: number; r: number; l: number };
export type Seed = {
  srs?: Record<string, Review>;
  days?: Record<string, number>;
  newDone?: number;
  seen?: string[];
  kind?: "mix" | "cards" | "hard";
  limit?: number;
  voice?: boolean;
};

export type FakeDb = { users: unknown[]; rows: unknown[] };

/** Podstawia włoski głos — headless Chromium nie ma żadnego — i notuje wypowiedzi. */
export async function stubSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const voices = [{ lang: "it-IT", name: "Test Italian" }];
    const listeners: (() => void)[] = [];
    window.__spoken = [];
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => voices,
        cancel() {},
        speak(u: { text: string }) {
          window.__spoken!.push(u.text);
        },
        addEventListener(_: string, listener: () => void) {
          listeners.push(listener);
        },
      },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: function (this: { text: string }, text: string) {
        this.text = text;
      },
    });
  });
}

/** Usuwa syntezator mowy, żeby sprawdzić zachowanie bez głosu it-IT. */
export async function stubNoSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
  });
}

export const spoken = (page: Page): Promise<string[]> =>
  page.evaluate(() => window.__spoken ?? []);

export const clearSpoken = (page: Page): Promise<void> =>
  page.evaluate(() => {
    window.__spoken = [];
  });

/**
 * Tryb lokalny to po prostu brak atrapy chmury: paczka testowa pyta o `__DB`,
 * a nie znajdując go, zostaje przy samej przeglądarce.
 */
export async function localMode(_page: Page): Promise<void> {
  /* nic do zrobienia — brak `__DB` sam w sobie znaczy „tryb lokalny" */
}

/** Konfiguracja z atrapą chmury: baza w pamięci strony, zero ruchu sieciowego. */
export async function cloudMode(page: Page, db: FakeDb, goal = 40): Promise<void> {
  await page.addInitScript(
    ([seeded, target]) => {
      window.__DB = seeded as never;
      window.__GOAL = target as number;
    },
    [db, goal] as const,
  );
}

/** Wstawia stan nauki do localStorage i przeładowuje stronę. */
export async function seed(page: Page, state: Seed): Promise<void> {
  await page.evaluate(
    ([s, key]) => {
      const put = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
      put("it250.srs", s.srs ?? {});
      put("it250.days", s.days ?? {});
      put("it250.day", { k: key, n: s.newDone ?? 0 });
      put("it250.seen", { k: key, w: s.seen ?? [] });
      put("it250.kind", s.kind ?? "mix");
      if (s.limit !== undefined) put("it250.limit", s.limit);
      if (s.voice !== undefined) put("it250.voice", s.voice);
    },
    [state, dayKey()] as const,
  );
  await page.reload({ waitUntil: "networkidle" });
}

export type View = "card" | "choice" | "cloze" | "type" | "listen" | "done";

/** Które ćwiczenie jest teraz na ekranie. Na raz jest dokładnie jedno. */
export async function currentView(page: Page): Promise<View> {
  const value = await page.locator("[data-view]").first().getAttribute("data-view");
  if (value === null) throw new Error("żadne ćwiczenie nie jest widoczne");
  return value as View;
}

/** O jakie słowo pyta bieżące ćwiczenie. */
export const askedWord = (page: Page): Promise<string> =>
  page
    .locator("[data-view]")
    .first()
    .getAttribute("data-word")
    .then((w) => w ?? "");

/** Odpowiada poprawnie na bieżące ćwiczenie i przechodzi dalej. */
export async function answerCorrectly(page: Page, grade: "2" | "3" | "4" = "3"): Promise<void> {
  const view = await currentView(page);
  if (view === "done") throw new Error("nie ma na co odpowiadać: sesja skończona");
  if (view === "card") {
    await page.keyboard.press("Space");
    await page.keyboard.press(grade);
    return;
  }
  if (view === "type") {
    const word = await askedWord(page);
    await page.fill('[data-test="type-input"]', word.split("/")[0]!.trim());
    await page.click('[data-test="check"]');
    await page.click('[data-test="next"]');
    return;
  }
  await page.locator('.opt[data-ok="1"]').first().click();
  await page.click('[data-test="next"]');
}

/** Przełącza zakładkę po widocznej nazwie. */
export const openTab = (page: Page, name: string | RegExp): Promise<void> =>
  page.getByRole("tab", { name }).click();

/**
 * Odpowiada poprawnie, aż na ekranie pojawi się szukana forma ćwiczenia.
 * Formy losują się z puli, więc test nie może po prostu założyć, że trafi
 * od razu — ale przy kilkudziesięciu podejściach nietrafienie jest błędem.
 */
export async function reachView(
  page: Page,
  wanted: View,
  options: { tries?: number; refill?: () => Promise<void> } = {},
): Promise<void> {
  const tries = options.tries ?? 40;
  for (let i = 0; i < tries; i++) {
    const view = await currentView(page);
    if (view === wanted) return;
    if (view === "done") {
      if (options.refill === undefined) break;
      await options.refill();
      continue;
    }
    await answerCorrectly(page);
  }
  throw new Error(`forma „${wanted}" nie wypadła w ${tries} podejściach`);
}

/** Pierwsze słowa kursu, odczytane z zakładki Słowa — bez zaglądania do paczki. */
export async function deckWords(page: Page, count: number): Promise<string[]> {
  await openTab(page, "Słowa");
  const rows = await page.locator("tbody tr").evaluateAll((list, n) =>
    list.slice(0, n as number).map((r) => r.getAttribute("data-word") ?? ""), count);
  await openTab(page, "Nauka");
  return rows.filter((w) => w !== "");
}
