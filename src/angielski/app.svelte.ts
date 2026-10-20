/**
 * Stan podstrony z angielskim: wybrane działy, słówka „umiem" i zebrane gwiazdki.
 * Zapis i jego odczyt są w `storage.ts`.
 */

import type { KeyValueStore } from "../ports/storage.js";
import type { Speech } from "../ports/speech.js";
import { CARDS, inSections, type Card, type SectionId } from "./words.js";
import { ALL, KEYS, readKnown, readSections, readStars } from "./storage.js";

export class English {
  readonly #store: KeyValueStore;
  readonly speech: Speech;

  sections = $state<ReadonlySet<SectionId>>(ALL);
  known = $state<ReadonlySet<string>>(new Set());
  stars = $state(0);

  /** Karty z zaznaczonych działów, w kolejności książki. */
  readonly cards: readonly Card[] = $derived(inSections(CARDS, this.sections));

  constructor(deps: { store: KeyValueStore; speech: Speech }) {
    this.#store = deps.store;
    this.speech = deps.speech;
    this.sections = readSections(deps.store);
    this.known = readKnown(deps.store);
    this.stars = readStars(deps.store);
  }

  /** Włącza albo wyłącza dział. Ostatniego nie da się wyłączyć — pusta talia nic nie uczy. */
  toggleSection(id: SectionId): void {
    const next = new Set(this.sections);
    if (next.has(id)) {
      if (next.size === 1) return;
      next.delete(id);
    } else next.add(id);
    this.#setSections(next);
  }

  selectAll(): void {
    this.#setSections(ALL);
  }

  #setSections(next: ReadonlySet<SectionId>): void {
    this.sections = next;
    this.#store.write(KEYS.sections, [...next]);
  }

  setKnown(card: Card, known: boolean): void {
    if (this.known.has(card.en) === known) return;
    const next = new Set(this.known);
    if (known) next.add(card.en);
    else next.delete(card.en);
    this.known = next;
    this.#store.write(KEYS.known, [...next]);
  }

  addStars(n: number): void {
    if (n <= 0) return;
    this.stars += n;
    this.#store.write(KEYS.stars, this.stars);
  }

  say(text: string): void {
    this.speech.say(text);
  }
}
