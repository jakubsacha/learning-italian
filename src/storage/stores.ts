/**
 * Implementacje portu zapisu. W przeglądarce prywatnej `localStorage` rzuca
 * wyjątkiem przy każdym zapisie — aplikacja ma wtedy działać dalej, tylko bez
 * pamiętania postępu, a nie wywalać się przy pierwszej ocenionej karcie.
 */

import type { KeyValueStore } from "../ports/storage.js";
import { parseJson } from "./codec.js";

export const browserStore = (backing: Storage): KeyValueStore => ({
  read(key) {
    try {
      return parseJson(backing.getItem(key));
    } catch {
      return undefined;
    }
  },
  write(key, value) {
    try {
      backing.setItem(key, JSON.stringify(value));
    } catch {
      /* brak miejsca albo tryb prywatny — dalej gramy bez zapisu */
    }
  },
  remove(key) {
    try {
      backing.removeItem(key);
    } catch {
      /* jw. */
    }
  },
});

/** Zapis w pamięci: do testów i jako awaryjne zastępstwo. */
export const memoryStore = (): KeyValueStore => {
  const map = new Map<string, unknown>();
  return {
    read: (key) => map.get(key),
    write: (key, value) => void map.set(key, value),
    remove: (key) => void map.delete(key),
  };
};
