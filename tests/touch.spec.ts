import { expect, test } from "@playwright/test";
import { localMode, seed, stubSpeech } from "./helpers";

/** Podpowiedzi klawiszy mają znikać tam, gdzie nie ma klawiatury. */
test.describe("podpowiedzi klawiszy", () => {
  test.beforeEach(async ({ page }) => {
    await localMode(page);
    await stubSpeech(page);
    await page.goto("/index.html");
    await seed(page, { kind: "cards" });
    await page.keyboard.press("Space");
  });

  test("na ekranie dotykowym są ukryte", async ({ page, isMobile }) => {
    test.skip(!isMobile, "dotyczy tylko urządzeń dotykowych");
    expect(await page.evaluate(() => matchMedia("(pointer:coarse)").matches)).toBe(true);
    const shown = await page.evaluate(() => {
      const vis = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).display !== "none" : null;
      };
      return { digit: vis("#f-actions .btn span i"), space: vis("#f-reveal small") };
    });
    expect(shown.digit).toBe(false);
    expect(shown.space).toBe(false);
  });

  test("na desktopie są widoczne", async ({ page, isMobile }) => {
    test.skip(isMobile, "dotyczy tylko myszy i klawiatury");
    const shown = await page.evaluate(() => {
      const vis = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).display !== "none" : null;
      };
      return { digit: vis("#f-actions .btn span i"), space: vis("#f-reveal small") };
    });
    expect(shown.digit).toBe(true);
    expect(shown.space).toBe(true);
  });
});
