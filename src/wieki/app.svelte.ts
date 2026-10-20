/** Stan gry w wieki: ustawienia, gwiazdki i rekord serii. Odczyt zapisu jest w `storage.ts`. */

import type { KeyValueStore } from "../ports/storage.js";
import { KEYS, readBest, readSettings, readStars } from "./storage.js";

export class Centuries {
  readonly #store: KeyValueStore;

  both = $state(false);
  famous = $state(true);
  stars = $state(0);
  best = $state(0);

  constructor(store: KeyValueStore) {
    this.#store = store;
    const s = readSettings(store);
    this.both = s.both;
    this.famous = s.famous;
    this.stars = readStars(store);
    this.best = readBest(store);
  }

  setBoth(on: boolean): void {
    this.both = on;
    this.#store.write(KEYS.both, on);
  }

  setFamous(on: boolean): void {
    this.famous = on;
    this.#store.write(KEYS.famous, on);
  }

  addStars(n: number): void {
    if (n <= 0) return;
    this.stars += n;
    this.#store.write(KEYS.stars, this.stars);
  }

  /** Zapisuje serię, jeśli to nowy rekord. Zwraca, czy był rekord. */
  streak(n: number): boolean {
    if (n <= this.best) return false;
    this.best = n;
    this.#store.write(KEYS.best, n);
    return true;
  }
}
