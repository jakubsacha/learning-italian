import { describe, expect, it } from "vitest";
import { browserStore, memoryStore } from "./stores";
import {
  DEFAULT_LIMIT,
  KEYS,
  loadSaved,
  saveProgress,
  saveSeen,
  scopedTo,
} from "./saved";
import { decodeReview, migrateFromBoxes } from "./progress";
import { asDateKey, asDays, asDayNumber, asWordId } from "../domain/types";

const store = () => memoryStore();

describe("odczyt zapisanego stanu", () => {
  it("pierwsza wizyta daje pusty, ale kompletny stan", () => {
    const saved = loadSaved(store());
    expect(saved.progress.size).toBe(0);
    expect(saved.limit).toBe(DEFAULT_LIMIT);
    expect(saved.kind).toBe("mix");
    expect(saved.voice).toBe(true);
    expect(saved.categories).toBeNull();
  });

  it("uszkodzony wpis pomija tylko siebie, reszta postępu zostaje", () => {
    const s = store();
    s.write(KEYS.progress, { ciao: { e: 2.5, i: 3, d: 100, r: 2, l: 0 }, zepsute: "nie obiekt" });
    const saved = loadSaved(s);
    expect(saved.progress.size).toBe(1);
    expect(saved.progress.get(asWordId("ciao"))?.interval).toBe(3);
  });

  it("brak współczynnika łatwości nie unieważnia wpisu", () => {
    expect(decodeReview({ i: 2, d: 5 })?.ease).toBe(2.5);
  });

  it("wpis bez terminu jest nie do uratowania i wypada", () => {
    expect(decodeReview({ i: 2 })).toBeNull();
  });

  it("stary format pudełkowy przechodzi na odstępy", () => {
    const migrated = migrateFromBoxes({ ciao: 0, grazie: 1, prego: 3, dziwne: "x" });
    expect(migrated.size).toBe(3);
    expect(migrated.get(asWordId("ciao"))?.interval).toBe(0);
    expect(migrated.get(asWordId("grazie"))?.interval).toBe(1);
    expect(migrated.get(asWordId("prego"))?.interval).toBe(7);
  });

  it("migracja nie nadpisuje istniejącego postępu", () => {
    const s = store();
    s.write(KEYS.legacyBoxes, { ciao: 3 });
    s.write(KEYS.progress, {});
    expect(loadSaved(s).progress.size).toBe(0);
  });

  it("limit spoza listy wraca do domyślnego", () => {
    const s = store();
    s.write(KEYS.limit, 250);
    expect(loadSaved(s).limit).toBe(DEFAULT_LIMIT);
    s.write(KEYS.limit, 30);
    expect(loadSaved(s).limit).toBe(30);
  });

  it("pusta lista kategorii znaczy wszystkie, nie żadnej", () => {
    const s = store();
    s.write(KEYS.categories, []);
    expect(loadSaved(s).categories).toBeNull();
  });

  it("liczniki przypisane do dnia nie przeciekają na następny", () => {
    const s = store();
    s.write(KEYS.seen, { k: "2026-01-01", w: ["ciao"] });
    const saved = loadSaved(s);
    expect(scopedTo(saved.seen, asDateKey("2026-01-01"), new Set()).size).toBe(1);
    expect(scopedTo(saved.seen, asDateKey("2026-01-02"), new Set()).size).toBe(0);
  });

  it("zapis i odczyt dają ten sam postęp", () => {
    const s = store();
    const progress = new Map([
      [asWordId("ciao"), { ease: 2.35, interval: asDays(9), due: asDayNumber(20_709), reps: 4, lapses: 1 }],
    ]);
    saveProgress(s, progress);
    expect(loadSaved(s).progress).toEqual(progress);
  });

  it("zapisane słowa widziane dziś wracają jako zbiór", () => {
    const s = store();
    saveSeen(s, { key: asDateKey("2026-02-03"), value: new Set([asWordId("ciao")]) });
    expect([...loadSaved(s).seen.value]).toEqual(["ciao"]);
  });

  it("tryb prywatny: zapis się nie udaje, aplikacja działa dalej", () => {
    const throwing: Storage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
      clear: () => {},
      key: () => null,
      length: 0,
    };
    expect(() => loadSaved(memoryStore())).not.toThrow();
    const s = browserStore(throwing);
    expect(() => s.write("x", 1)).not.toThrow();
    expect(s.read("x")).toBeUndefined();
  });
});
