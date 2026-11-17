/**
 * Stan podstrony z angielskim: wybrane działy, słówka „umiem" i zebrane gwiazdki.
 * Zapis i jego odczyt są w `storage.ts`.
 */

import type { KeyValueStore } from "../ports/storage.js";
import type { Speech } from "../ports/speech.js";
import { CARDS, activeIn, cardsOf, inSections, sectionsOf, type Card, type SectionId, type Unit } from "./words.js";
import { ALL, KEYS, LATEST_UNIT, readKnown, readSections, readStars, readUnit } from "./storage.js";

export class English {
  readonly #store: KeyValueStore;
  readonly speech: Speech;

  unit = $state<Unit>(LATEST_UNIT);
  /** Zaznaczone działy ze wszystkich unitów; liczą się te z bieżącego. */
  sections = $state<ReadonlySet<SectionId>>(ALL);
  known = $state<ReadonlySet<string>>(new Set());
  stars = $state(0);

  /** Działy bieżącego unitu, z których bierzemy karty. */
  readonly active: ReadonlySet<SectionId> = $derived(activeIn(this.unit, this.sections));
  /** Karty z zaznaczonych działów, w kolejności książki. */
  readonly cards: readonly Card[] = $derived(inSections(CARDS, this.active));
  /** Wszystkie karty bieżącego unitu — np. na złe odpowiedzi w grze. */
  readonly unitCards: readonly Card[] = $derived(cardsOf(this.unit));

  constructor(deps: { store: KeyValueStore; speech: Speech }) {
    this.#store = deps.store;
    this.speech = deps.speech;
    this.unit = readUnit(deps.store);
    this.sections = readSections(deps.store);
    this.known = readKnown(deps.store);
    this.stars = readStars(deps.store);
  }

  setUnit(unit: Unit): void {
    this.unit = unit;
    this.#store.write(KEYS.unit, unit);
  }

  /**
   * Włącza albo wyłącza dział bieżącego unitu. Ostatniego nie da się wyłączyć —
   * pusta talia nic nie uczy. Wybór w innym unicie zostaje nietknięty.
   */
  toggleSection(id: SectionId): void {
    const next = new Set([...this.sections, ...this.active]);
    if (this.active.has(id)) {
      if (this.active.size === 1) return;
      next.delete(id);
    } else next.add(id);
    this.#setSections(next);
  }

  /** Wszystkie działy bieżącego unitu. */
  selectAll(): void {
    this.#setSections(new Set([...this.sections, ...sectionsOf(this.unit).map((s) => s.id)]));
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
