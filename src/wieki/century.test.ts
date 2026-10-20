import { describe, expect, it } from "vitest";
import { FAMOUS, after, before, NE_MAX, PNE_MAX, centuryLabel, centuryOf, choices, explain, randomYear, roman, sameCentury, span, yearLabel } from "./century";
import type { Year } from "./century";
import { firstRng } from "../domain/fixtures";

const ne = (value: number): Year => ({ value, era: "ne" });
const pne = (value: number): Year => ({ value, era: "pne" });
const label = (y: Year) => centuryLabel(centuryOf(y));

describe("który to wiek", () => {
  it("granice wieków: pełna setka należy jeszcze do starego wieku", () => {
    expect(label(ne(1))).toBe("I w. n.e.");
    expect(label(ne(100))).toBe("I w. n.e.");
    expect(label(ne(101))).toBe("II w. n.e.");
    expect(label(ne(1410))).toBe("XV w. n.e.");
    expect(label(ne(1500))).toBe("XV w. n.e.");
    expect(label(ne(1501))).toBe("XVI w. n.e.");
    expect(label(ne(2000))).toBe("XX w. n.e.");
    expect(label(ne(2001))).toBe("XXI w. n.e.");
  });

  it("przed naszą erą liczy się tak samo, tylko wstecz", () => {
    expect(label(pne(1))).toBe("I w. p.n.e.");
    expect(label(pne(100))).toBe("I w. p.n.e.");
    expect(label(pne(753))).toBe("VIII w. p.n.e.");
    expect(span(centuryOf(pne(753)))).toBe("800–701 p.n.e.");
    expect(span(centuryOf(ne(1410)))).toBe("1401–1500");
  });

  it("cyfry rzymskie", () => {
    expect([1, 4, 9, 14, 19, 20, 21, 29, 30].map(roman)).toEqual(["I", "IV", "IX", "XIV", "XIX", "XX", "XXI", "XXIX", "XXX"]);
  });

  it("rok wygląda jak w podręczniku", () => {
    expect(yearLabel(ne(966))).toBe("966 r.");
    expect(yearLabel(pne(753))).toBe("753 r. p.n.e.");
  });

  it("wyjaśnienie: +1, a przy pełnej setce bez dodawania", () => {
    expect(explain(ne(1410))).toBe("Zakryj dwie ostatnie cyfry i dodaj 1: 14 + 1 = 15 → XV wiek (lata 1401–1500).");
    expect(explain(ne(1500))).toBe("1500 kończy się na 00, więc nic nie dodajesz: 15 → XV wiek (lata 1401–1500).");
    expect(explain(ne(45))).toContain("0 + 1 = 1 → I wiek (lata 1–100)");
    expect(explain(pne(753))).toContain("VIII wiek p.n.e. (lata 800–701 p.n.e.)");
  });
});

describe("sąsiednie wieki na linijce", () => {
  it("idą zgodnie z czasem, także przez granicę er", () => {
    expect(centuryLabel(before(centuryOf(ne(1410))))).toBe("XIV w. n.e.");
    expect(centuryLabel(after(centuryOf(ne(1410))))).toBe("XVI w. n.e.");
    expect(centuryLabel(before(centuryOf(pne(753))))).toBe("IX w. p.n.e.");
    expect(centuryLabel(after(centuryOf(pne(753))))).toBe("VII w. p.n.e.");
    expect(centuryLabel(after(centuryOf(pne(50))))).toBe("I w. n.e.");
    expect(centuryLabel(before(centuryOf(ne(50))))).toBe("I w. p.n.e.");
  });
});

describe("odpowiedzi do wyboru", () => {
  const years = [ne(1), ne(99), ne(100), ne(1410), ne(1500), ne(2025), pne(1), pne(753), pne(3000)];

  it("zawsze cztery różne, w tym dobra, i żadna spoza gry", () => {
    for (const both of [false, true]) {
      for (const y of years) {
        if (!both && y.era === "pne") continue;
        const opts = choices(y, both, firstRng);
        expect(opts, yearLabel(y)).toHaveLength(4);
        expect(opts.some((o) => sameCentury(o, centuryOf(y)))).toBe(true);
        expect(new Set(opts.map(centuryLabel)).size).toBe(4);
        for (const o of opts) {
          expect(o.n).toBeGreaterThanOrEqual(1);
          expect(o.n).toBeLessThanOrEqual(o.era === "ne" ? 21 : 30);
        }
      }
    }
  });

  it("bez p.n.e. wszystkie odpowiedzi są z naszej ery", () => {
    for (const o of choices(ne(1410), false, firstRng)) expect(o.era).toBe("ne");
  });

  it("z obiema erami jest pułapka: ta sama liczba w drugiej erze", () => {
    expect(choices(ne(1410), true, firstRng).map(centuryLabel)).toContain("XV w. p.n.e.");
  });
});

describe("losowanie roku", () => {
  it("nigdy rok zerowy ani spoza zakresu; bez p.n.e. tylko nasza era", () => {
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 3000; i++) {
      const both = i % 2 === 0;
      const y = randomYear(rng, both, i % 3 === 0);
      expect(Number.isInteger(y.value)).toBe(true);
      expect(y.value).toBeGreaterThanOrEqual(1);
      expect(y.value).toBeLessThanOrEqual(y.era === "ne" ? NE_MAX : PNE_MAX);
      if (!both) expect(y.era).toBe("ne");
    }
  });

  it("słynne daty są w zakresie gry", () => {
    for (const f of FAMOUS) expect(f.value).toBeLessThanOrEqual(f.era === "ne" ? NE_MAX : PNE_MAX);
  });
});

describe("zapis", () => {
  it("ustawienia, gwiazdki i rekord; śmieci dają wartości domyślne", async () => {
    const { KEYS, readBest, readSettings, readStars } = await import("./storage");
    const { memoryStore } = await import("../storage/stores");
    const store = memoryStore();
    expect(readSettings(store)).toEqual({ both: false, famous: true });
    store.write(KEYS.both, true);
    store.write(KEYS.famous, "tak");
    store.write(KEYS.stars, 7);
    store.write(KEYS.best, -3);
    expect(readSettings(store)).toEqual({ both: true, famous: true });
    expect(readStars(store)).toBe(7);
    expect(readBest(store)).toBe(0);
  });
});
