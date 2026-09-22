import { expect, test } from "@playwright/test";
import { localMode, seed, stubSpeech } from "./helpers";

/** Podpowiedzi klawiszy mają znikać tam, gdzie nie ma klawiatury. */
test.describe("podpowiedzi klawiszy", () => {
  test.beforeEach(async ({ page }) => {
    await localMode(page);
    await stubSpeech(page);
    await page.goto("/index.html");
    await seed(page, { kind: "cards" });
  });

  const shown = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const vis = (sel: string): boolean | null => {
        const el = document.querySelector(sel);
        return el === null ? null : getComputedStyle(el).display !== "none";
      };
      return { space: vis('[data-test="reveal"] small') };
    });

  test("na ekranie dotykowym są ukryte", async ({ page, isMobile }) => {
    test.skip(!isMobile, "dotyczy tylko urządzeń dotykowych");
    expect(await page.evaluate(() => matchMedia("(pointer:coarse)").matches)).toBe(true);
    expect((await shown(page)).space).toBe(false);
    await page.locator(".card.flash").click();
    const digit = await page.evaluate(
      () => getComputedStyle(document.querySelector(".grades .btn span i")!).display,
    );
    expect(digit).toBe("none");
  });

  test("na desktopie są widoczne", async ({ page, isMobile }) => {
    test.skip(isMobile, "dotyczy tylko myszy i klawiatury");
    expect((await shown(page)).space).toBe(true);
    await page.keyboard.press("Space");
    const digit = await page.evaluate(
      () => getComputedStyle(document.querySelector(".grades .btn span i")!).display,
    );
    expect(digit).not.toBe("none");
  });
});
