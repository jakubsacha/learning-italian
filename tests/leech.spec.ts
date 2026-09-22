import { expect, test } from "@playwright/test";
import {
  answerCorrectly,
  currentView,
  dayNumber,
  deckWords,
  localMode,
  openTab,
  seed,
  stubSpeech,
} from "./helpers";

const LEECH_THRESHOLD = 3;

const leeches = (words: readonly string[], offsetDays = 30) =>
  Object.fromEntries(
    words.map((w, i) => [
      w,
      { e: 1.8, i: 30, d: dayNumber(offsetDays), r: 9, l: LEECH_THRESHOLD + i },
    ]),
  );

test.beforeEach(async ({ page }) => {
  await localMode(page);
  await stubSpeech(page);
  await page.goto("/index.html");
});

test("trudne słowa są dociągane przed terminem, ale nie wracają po przeładowaniu", async ({
  page,
}) => {
  await seed(page, {
    kind: "cards",
    newDone: 30,
    srs: leeches(["ciao", "sì", "no", "grazie", "prego"]),
  });
  await expect(page.getByTestId("left")).toHaveText("Zostało 5 kart");

  for (let i = 0; i < 5; i++) await answerCorrectly(page);
  expect(await currentView(page)).toBe("done");

  await page.reload({ waitUntil: "networkidle" });
  expect(await currentView(page)).toBe("done");
  await expect(page.getByTestId("left")).toHaveText("Sesja skończona");
});

test("dociąganie trudnych jest ograniczone do pięciu na sesję", async ({ page }) => {
  const words = await deckWords(page, 9);
  await seed(page, { kind: "cards", newDone: 30, srs: leeches(words) });
  await expect(page.getByTestId("left")).toHaveText("Zostało 5 kart");
});

test("zakładka Trudne ma własną kolejkę i sensowny stan pusty", async ({ page }) => {
  await seed(page, { kind: "hard" });
  expect(await currentView(page)).toBe("done");
  await expect(page.locator('[data-view="done"] b')).toHaveText("Nie ma trudnych słów");
  await expect(page.getByTestId("more")).toHaveCount(0);

  await seed(page, { kind: "hard", srs: leeches(["ciao", "sì", "no"]) });
  await expect(page.getByTestId("left")).toHaveText("Trening trudnych: 3 karty");
  for (let i = 0; i < 3; i++) await answerCorrectly(page);
  await expect(page.locator('[data-view="done"] b')).toHaveText(/Trudne przerobione/);
});

test("licznik przy zakładce pokazuje, ile słów sprawia kłopot", async ({ page }) => {
  await seed(page, { kind: "cards", srs: leeches(["ciao", "sì", "no"]) });
  await expect(page.getByRole("tab", { name: /Trudne/ })).toHaveText("Trudne 3");
});

test("ekran końca dnia wymienia słowa, na których się wykładasz", async ({ page }) => {
  await seed(page, { kind: "cards", newDone: 30, srs: leeches(["ciao", "sì"], 0) });
  for (let i = 0; i < 2; i++) await answerCorrectly(page);
  await expect(page.getByTestId("leeches")).toContainText("Najczęściej się wykładasz na:");
  // lista nie może wylądować w przycisku oceny (był taki błąd)
  await expect(page.locator(".grades")).toHaveCount(0);
});
