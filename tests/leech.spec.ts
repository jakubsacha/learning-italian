import { expect, test } from "@playwright/test";
import {
  answerCorrectly,
  askedWord,
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
    kind: "mix",
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
  await seed(page, { kind: "mix", newDone: 30, srs: leeches(words) });
  await expect(page.getByTestId("left")).toHaveText("Zostało 5 kart");
});

test("trudne słowa wchodzą do rundy powtórek także przed terminem", async ({ page }) => {
  await seed(page, { kind: "review", newDone: 30, srs: leeches(["ciao", "sì", "no"]) });
  await expect(page.getByTestId("left")).toHaveText("Powtórki: 3 karty");
});

test("zakładka Trudne ma własną kolejkę i sensowny stan pusty", async ({ page }) => {
  await seed(page, { kind: "hard" });
  expect(await currentView(page)).toBe("done");
  await expect(page.locator('[data-view="done"] b')).toHaveText("Nie ma trudnych słów");
  await expect(page.getByTestId("more")).toHaveCount(0);

  await seed(page, { kind: "hard", srs: leeches(["ciao", "sì", "no"]) });
  await expect(page.getByTestId("left")).toHaveText("Trening trudnych: 3 karty");
  const asked: string[] = [];
  for (let i = 0; i < 3; i++) {
    asked.push(await askedWord(page));
    await answerCorrectly(page);
  }
  expect(asked.sort()).toEqual(["ciao", "no", "sì"]);
  await expect(page.locator('[data-view="done"] b')).toHaveText(/Trudne przerobione/);
  // bez „jeszcze raz": lista by się nie zmieniła, bo wpadki zostają
  await expect(page.getByTestId("more")).toHaveCount(0);
});

test("trening trudnych nie wraca po przeładowaniu do tych samych słów w kółko", async ({ page }) => {
  await seed(page, { kind: "hard", srs: leeches(["ciao", "sì"]) });
  for (let i = 0; i < 2; i++) await answerCorrectly(page);
  expect(await currentView(page)).toBe("done");
  // Po przeładowaniu trening zaczyna się od nowa — to świadomy wybór, a nie pętla w sesji.
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("left")).toHaveText("Trening trudnych: 2 karty");
});

test("licznik przy zakładce pokazuje, ile słów sprawia kłopot", async ({ page }) => {
  await seed(page, { kind: "mix", srs: leeches(["ciao", "sì", "no"]) });
  await expect(page.getByRole("tab", { name: /^Trudne/ })).toHaveText("Trudne 3");
});

test("ekran końca dnia wymienia słowa, na których się wykładasz", async ({ page }) => {
  await seed(page, { kind: "mix", newDone: 30, srs: leeches(["ciao", "sì"], 0) });
  for (let i = 0; i < 2; i++) await answerCorrectly(page);
  await expect(page.getByTestId("leeches")).toContainText("Najczęściej się wykładasz na:");
  // lista nie może wylądować w przycisku oceny (był taki błąd)
  await expect(page.locator(".grades")).toHaveCount(0);
});
