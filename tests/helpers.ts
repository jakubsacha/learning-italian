import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

const FAKE_SUPABASE = readFileSync(
  fileURLToPath(new URL("./fixtures/fake-supabase.js", import.meta.url)),
  "utf8",
);

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

/** Podstawia włoski głos — headless Chromium nie ma żadnego — i notuje wypowiedzi. */
export async function stubSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const voices = [{ lang: "it-IT", name: "Test Italian" }];
    window.__spoken = [];
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => voices,
        cancel() {},
        speak(u: { text: string }) {
          window.__spoken!.push(u.text);
        },
        onvoiceschanged: null,
      },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: function (this: { text: string }, text: string) { this.text = text; },
    });
  });
}

/** Usuwa syntezator mowy, żeby sprawdzić zachowanie bez głosu it-IT. */
export async function stubNoSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
  });
}

export async function spoken(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__spoken ?? []);
}

export async function clearSpoken(page: Page): Promise<void> {
  await page.evaluate(() => { window.__spoken = []; });
}

/** Aplikacja bez config.js działa w trybie lokalnym — tak testujemy samą naukę. */
export async function localMode(page: Page): Promise<void> {
  await page.route("**/config.js", (r) => r.fulfill({ contentType: "text/javascript", body: "" }));
}

/** Konfiguracja z atrapą Supabase: podmieniamy moduł z CDN i plik konfiguracyjny. */
export async function cloudMode(
  page: Page,
  db: { users: unknown[]; rows: unknown[] },
  goal = 40,
): Promise<void> {
  await page.addInitScript((seeded) => {
    window.__DB = seeded;
    window.__UPSERTS = 0;
  }, db);
  await page.route("**/cdn.jsdelivr.net/**", (r) =>
    r.fulfill({ contentType: "text/javascript", body: FAKE_SUPABASE }));
  await page.route("**/config.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: `window.SUPABASE_URL="https://test.supabase.co";window.SUPABASE_ANON_KEY="k";window.DAILY_GOAL=${goal};`,
    }));
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

/** Który widok ćwiczenia jest teraz na ekranie. */
export async function currentView(
  page: Page,
): Promise<"card" | "choice" | "cloze" | "type" | "listen" | "done" | "none"> {
  const map = [
    ["#f-done", "done"],
    ["#x-type", "type"],
    ["#x-listen", "listen"],
    ["#x-gap", "cloze"],
    ["#x-quiz", "choice"],
    ["#flashcard", "card"],
  ] as const;
  for (const [sel, name] of map) if (await page.locator(sel).isVisible()) return name;
  return "none";
}

/** Kontener odpowiedzi dla danego widoku — ukryte widoki zostawiają w DOM
    swoje wyłączone przyciski, więc selektor musi być zawężony. */
const OPTIONS_OF = {
  choice: "#xq-opts",
  listen: "#xl-opts",
  cloze: "#xg-opts",
} as const;

/** Odpowiada poprawnie na bieżące ćwiczenie i przechodzi dalej. */
export async function answerCorrectly(page: Page, grade: "2" | "3" | "4" = "3"): Promise<void> {
  const view = await currentView(page);
  if (view === "card") {
    await page.keyboard.press("Space");
    await page.keyboard.press(grade);
    return;
  }
  if (view === "type") {
    const word = await page.evaluate(() => current!.it);
    await page.fill("#xt-in", word.split("/")[0]!.trim());
    await page.click("#xt-check");
    await page.keyboard.press("Space");
    return;
  }
  if (view === "done" || view === "none") throw new Error(`nie ma na co odpowiadać: ${view}`);
  await page.locator(`${OPTIONS_OF[view]} .opt[data-ok="1"]`).click();
  await page.keyboard.press("Space");
}
