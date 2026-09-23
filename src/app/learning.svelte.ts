/**
 * Stan nauki: jedyne miejsce, w którym czysta domena spotyka się z zapisem,
 * zegarem i wymową. Komponenty czytają stąd gotowe wartości i wołają metody —
 * same nie liczą niczego i nie dotykają `localStorage`.
 */

import type { Clock } from "../ports/clock.js";
import type { Speech } from "../ports/speech.js";
import type { KeyValueStore } from "../ports/storage.js";
import {
  DEFAULT_LIMIT,
  loadSaved,
  saveCategories,
  saveCounts,
  saveKind,
  saveLimit,
  saveNewDay,
  saveProgress,
  saveSeen,
  saveVoice,
  type NewLimit,
} from "../storage/saved.js";
import { scopedTo } from "../storage/saved.js";
import { DECK, sentencesFor } from "../data/deck.js";
import { dateKeyOf, dayNumberOf } from "../domain/day.js";
import type {
  DailyCounts,
  DateKey,
  Progress,
  Session,
  SessionKind,
  Word,
  WordId,
} from "../domain/types.js";
import type { QueueInput } from "../domain/queue.js";
import { advance, answer as answerSession, startSession, type Answer, type Deps } from "../domain/session.js";
import { statsOf, summarise, trimHistory } from "../domain/stats.js";
import { systemRng } from "../domain/random.js";
import { isLeech, schedule, stateOf } from "../domain/scheduler.js";

export type LearningEnv = {
  readonly store: KeyValueStore;
  readonly clock: Clock;
  readonly speech: Speech;
  /** Wołane po każdej zmianie postępu — stąd rusza synchronizacja z chmurą. */
  readonly onProgress?: () => void;
};

export class Learning {
  readonly deck = DECK;

  #env: LearningEnv;
  #progress = $state<Progress>(new Map());
  #counts = $state<DailyCounts>(new Map());
  #today = $state<DateKey>("" as DateKey);
  #newToday = $state(0);
  #seen = $state<ReadonlySet<WordId>>(new Set());
  #limit = $state<NewLimit>(DEFAULT_LIMIT);
  #categories = $state<readonly string[] | null>(null);
  #kind = $state<SessionKind>("mix");
  #voice = $state(true);
  /** Sesja poza planem dnia: nie dolicza nowych słów do limitu. */
  #extra = $state(false);
  #session = $state<Session>({
    status: "done",
    kind: "mix",
    reason: "daily-finished",
    nextDue: null,
    newInReserve: 0,
  });

  constructor(env: LearningEnv) {
    this.#env = env;
    const saved = loadSaved(env.store);
    const today = dateKeyOf(env.clock.now());
    this.#progress = saved.progress;
    this.#counts = saved.counts;
    this.#today = today;
    this.#newToday = scopedTo(saved.newDay, today, 0);
    this.#seen = scopedTo(saved.seen, today, new Set());
    this.#limit = saved.limit;
    this.#categories = saved.categories;
    this.#kind = saved.kind;
    this.#voice = saved.voice;
    // Głosy w Chrome dochodzą po starcie; wtedy dopiero mają sens ćwiczenia ze słuchu.
    env.speech.onChange(() => this.restart());
    this.restart();
  }

  /* ---------- odczyt ---------- */

  get session(): Session {
    return this.#session;
  }
  get kind(): SessionKind {
    return this.#kind;
  }
  get limit(): NewLimit {
    return this.#limit;
  }
  get voice(): boolean {
    return this.#voice;
  }
  get progress(): Progress {
    return this.#progress;
  }
  get counts(): DailyCounts {
    return this.#counts;
  }
  get categories(): readonly string[] {
    return this.#categories ?? this.deck.categories;
  }
  get newToday(): number {
    return Math.min(this.#newToday, this.#limit);
  }
  get doneToday(): number {
    return this.#counts.get(this.#today) ?? 0;
  }

  /** Słowa objęte wybranymi kategoriami. Pusty wybór to wszystkie, nie żadne. */
  readonly pool = $derived.by<readonly Word[]>(() => {
    const chosen = this.#categories;
    if (chosen === null) return this.deck.words;
    const set = new Set(chosen);
    const filtered = this.deck.words.filter((w) => set.has(w.category));
    return filtered.length > 0 ? filtered : this.deck.words;
  });

  readonly summary = $derived.by(() => summarise(this.#session, this.#progress));

  /** Ile słów czeka w treningu trudnych — liczba przy zakładce. */
  readonly leechCount = $derived.by(
    () => this.pool.filter((w) => isLeech(this.#progress.get(w.id))).length,
  );

  readonly stats = $derived.by(() =>
    statsOf(
      this.deck.words,
      this.deck.categories,
      this.#progress,
      this.#counts,
      this.#env.clock.now(),
      dayNumberOf(this.#env.clock.now()),
    ),
  );

  /* ---------- zapis ---------- */

  #input(): QueueInput {
    return {
      pool: this.pool,
      progress: this.#progress,
      today: dayNumberOf(this.#env.clock.now()),
      newLimit: this.#limit,
      newDone: this.#newToday,
      extra: this.#extra,
      seen: this.#seen,
    };
  }

  #deps(): Deps {
    return {
      sentencesFor,
      canListen: this.#env.speech.available,
      canType: () => true,
      rng: systemRng,
    };
  }

  /** Zmiana daty w trakcie sesji zeruje liczniki dnia — inaczej limit by nie działał. */
  #rollDay(): void {
    const today = dateKeyOf(this.#env.clock.now());
    if (today === this.#today) return;
    this.#today = today;
    this.#newToday = 0;
    this.#seen = new Set();
    saveNewDay(this.#env.store, { key: today, value: 0 });
    saveSeen(this.#env.store, { key: today, value: this.#seen });
  }

  /* ---------- sterowanie ---------- */

  restart(): void {
    this.#rollDay();
    this.#session = startSession(this.#kind, this.#input(), this.#deps());
    this.speak();
  }

  /**
   * Przełączenie zakładki. Każdy rodzaj sesji ma własną kolejkę, więc zmiana
   * zakładki zaczyna nową sesję. Postęp słów się nie gubi — zapisuje się przy
   * każdej odpowiedzi, a nie na końcu sesji.
   */
  setKind(kind: SessionKind): void {
    if (kind === this.#kind) return;
    this.#kind = kind;
    saveKind(this.#env.store, kind);
    this.#extra = false;
    this.restart();
  }

  answer(given: Answer): void {
    const result = answerSession(this.#session, given, this.#input());
    if (result === null) return;
    this.#session = result.session;

    const progress = new Map(this.#progress);
    progress.set(result.word.id, result.review);
    this.#progress = progress;

    const seen = new Set(this.#seen);
    seen.add(result.word.id);
    this.#seen = seen;

    // Tylko pierwsze zetknięcie liczy się do dziennego limitu, i nie w sesji dodatkowej.
    if (result.wasNew && !this.#extra) {
      this.#newToday += 1;
      saveNewDay(this.#env.store, { key: this.#today, value: this.#newToday });
    }

    saveProgress(this.#env.store, this.#progress);
    saveSeen(this.#env.store, { key: this.#today, value: this.#seen });
    this.countAnswer();
  }

  /**
   * Jedna odpowiedź więcej w dzisiejszym wyniku. Liczą się też rozmówki: dzienny
   * licznik, seria i wspólny cel mierzą wysiłek, a nie to, czy było to słowo, czy zdanie.
   */
  countAnswer(): void {
    this.#rollDay();
    const counts = new Map(this.#counts);
    counts.set(this.#today, (counts.get(this.#today) ?? 0) + 1);
    this.#counts = trimHistory(counts);
    saveCounts(this.#env.store, this.#counts);
    this.#env.onProgress?.();
  }

  next(): void {
    this.#rollDay();
    this.#session = advance(this.#session, this.#input(), this.#deps());
    this.speak();
  }

  /**
   * Czyta pytanie, jeśli tak ustawiłeś. Ze słuchu czyta zawsze — bez tego nie ma
   * ćwiczenia. Przy wpisywaniu i przy pytaniu „jak to powiedzieć po włosku" musi
   * milczeć: przeczytana odpowiedź to żadne pytanie.
   */
  speak(): void {
    if (this.#session.status !== "active") return;
    const { current } = this.#session;
    if (current.kind === "listen") {
      this.#env.speech.say(current.word.it);
      return;
    }
    if (!this.#voice) return;
    const givesAnswer =
      current.kind === "type" ||
      current.kind === "cloze" ||
      (current.kind === "choice" && current.direction === "pl-it");
    if (!givesAnswer) this.#env.speech.say(current.word.it);
  }

  /** Czyta po odpowiedzi, o ile wymowa jest włączona. */
  sayIfOn(text: string): void {
    if (this.#voice) this.#env.speech.say(text);
  }

  say(text: string): void {
    this.#env.speech.say(text);
  }

  sayCurrent(): void {
    if (this.#session.status === "active") this.#env.speech.say(this.#session.current.word.it);
  }

  /** Nauka poza planem: kolejna paczka nowych słów, bez ruszania limitu dnia. */
  studyMore(): void {
    this.#extra = true;
    this.restart();
  }

  setLimit(limit: NewLimit): void {
    this.#limit = limit;
    saveLimit(this.#env.store, limit);
    this.#extra = false;
    this.restart();
  }

  toggleCategory(category: string): void {
    const chosen = new Set(this.#categories ?? this.deck.categories);
    if (chosen.has(category)) chosen.delete(category);
    else chosen.add(category);
    const next = [...this.deck.categories].filter((c) => chosen.has(c));
    this.#categories = next.length === this.deck.categories.length ? null : next;
    saveCategories(this.#env.store, this.#categories);
    this.restart();
  }

  /** Odznaczenie wszystkiego znaczy w praktyce "bez filtra" — tak samo jak wcześniej. */
  noCategories(): void {
    this.#categories = [];
    saveCategories(this.#env.store, []);
    this.restart();
  }

  allCategories(): void {
    this.#categories = null;
    saveCategories(this.#env.store, null);
    this.restart();
  }

  setVoice(on: boolean): void {
    this.#voice = on;
    saveVoice(this.#env.store, on);
  }

  /** Zerowanie postępu. Historia dni zostaje — to Twoja seria, nie stan słów. */
  reset(): void {
    this.#progress = new Map();
    this.#seen = new Set();
    this.#newToday = 0;
    this.#extra = false;
    saveProgress(this.#env.store, this.#progress);
    saveSeen(this.#env.store, { key: this.#today, value: this.#seen });
    saveNewDay(this.#env.store, { key: this.#today, value: 0 });
    this.#env.onProgress?.();
    this.restart();
  }

  /**
   * Pomyłka w zakładce Quiz cofa słowo do powtórki. Nie dolicza się do dziennego
   * licznika fiszek — quiz jest ćwiczeniem obok sesji, nie jej częścią.
   */
  penalise(word: Word): void {
    const review = this.#progress.get(word.id);
    if (review === undefined) return;
    const progress = new Map(this.#progress);
    progress.set(word.id, schedule(review, "again", dayNumberOf(this.#env.clock.now()), 1));
    this.#progress = progress;
    saveProgress(this.#env.store, progress);
    this.#env.onProgress?.();
  }

  /** Postęp przyjęty z chmury — nadpisuje to, co lokalnie, bez ponownego zapisu w pętli. */
  adopt(progress: Progress, counts: DailyCounts): void {
    this.#progress = progress;
    this.#counts = counts;
    saveProgress(this.#env.store, progress);
    saveCounts(this.#env.store, counts);
    this.restart();
  }

  stateOfWord(word: Word): ReturnType<typeof stateOf> {
    return stateOf(this.#progress.get(word.id));
  }
}
