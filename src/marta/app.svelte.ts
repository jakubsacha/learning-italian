/**
 * Stan nauki Marty. Ta sama domena co w kursie włoskim, tylko mniej pokręteł:
 * bez kategorii, bez konta w chmurze, bez wyboru trybu. Jedna sesja dziennie.
 */

import type { Clock } from "../ports/clock.js";
import type { Speech } from "../ports/speech.js";
import type { KeyValueStore } from "../ports/storage.js";
import { DECK, canType, sentencesFor } from "./deck.js";
import {
  NEW_PER_DAY,
  loadSaved,
  saveCounts,
  saveNewDay,
  saveProgress,
  saveSeen,
  saveVoice,
  scopedTo,
} from "./storage.js";
import { dateKeyOf, dayNumberOf, streakLength } from "../domain/day.js";
import type { DailyCounts, DateKey, Progress, Session, Word, WordId } from "../domain/types.js";
import type { QueueInput } from "../domain/queue.js";
import { advance, answer as answerSession, startSession, type Answer, type Deps } from "../domain/session.js";
import { summarise, trimHistory } from "../domain/stats.js";
import { systemRng } from "../domain/random.js";
import { stateOf } from "../domain/scheduler.js";

export type MartaEnv = {
  readonly store: KeyValueStore;
  readonly clock: Clock;
  readonly speech: Speech;
};

export class Marta {
  readonly deck = DECK;

  #env: MartaEnv;
  #progress = $state<Progress>(new Map());
  #counts = $state<DailyCounts>(new Map());
  #today = $state<DateKey>("" as DateKey);
  #newToday = $state(0);
  #seen = $state<ReadonlySet<WordId>>(new Set());
  #voice = $state(true);
  #extra = $state(false);
  #session = $state<Session>({
    status: "done",
    kind: "mix",
    reason: "daily-finished",
    nextDue: null,
    newInReserve: 0,
  });

  constructor(env: MartaEnv) {
    this.#env = env;
    const saved = loadSaved(env.store);
    const today = dateKeyOf(env.clock.now());
    this.#progress = saved.progress;
    this.#counts = saved.counts;
    this.#today = today;
    this.#newToday = scopedTo(saved.newDay, today, 0);
    this.#seen = scopedTo(saved.seen, today, new Set());
    this.#voice = saved.voice;
    env.speech.onChange(() => this.restart());
    this.restart();
  }

  get session(): Session {
    return this.#session;
  }
  get voice(): boolean {
    return this.#voice;
  }
  get progress(): Progress {
    return this.#progress;
  }
  get doneToday(): number {
    return this.#counts.get(this.#today) ?? 0;
  }

  readonly summary = $derived.by(() => summarise(this.#session, this.#progress));

  readonly streak = $derived.by(() => streakLength(this.#counts, this.#env.clock.now()));

  /** Ile słówek już umie na tyle, żeby wracały rzadko. */
  readonly learned = $derived.by(
    () => this.deck.words.filter((w) => stateOf(this.#progress.get(w.id)) === "mature").length,
  );

  readonly started = $derived.by(
    () => this.deck.words.filter((w) => this.#progress.has(w.id)).length,
  );

  stateOfWord(word: Word): ReturnType<typeof stateOf> {
    return stateOf(this.#progress.get(word.id));
  }

  #input(): QueueInput {
    return {
      pool: this.deck.words,
      progress: this.#progress,
      today: dayNumberOf(this.#env.clock.now()),
      newLimit: NEW_PER_DAY,
      newDone: this.#newToday,
      extra: this.#extra,
      seen: this.#seen,
    };
  }

  #deps(): Deps {
    return {
      sentencesFor,
      canListen: this.#env.speech.available,
      canType,
      rng: systemRng,
    };
  }

  #rollDay(): void {
    const today = dateKeyOf(this.#env.clock.now());
    if (today === this.#today) return;
    this.#today = today;
    this.#newToday = 0;
    this.#seen = new Set();
    saveNewDay(this.#env.store, { key: today, value: 0 });
    saveSeen(this.#env.store, { key: today, value: this.#seen });
  }

  restart(): void {
    this.#rollDay();
    this.#session = startSession("mix", this.#input(), this.#deps());
    this.speak();
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

    const counts = new Map(this.#counts);
    counts.set(this.#today, (counts.get(this.#today) ?? 0) + 1);
    this.#counts = trimHistory(counts);

    if (result.wasNew && !this.#extra) {
      this.#newToday += 1;
      saveNewDay(this.#env.store, { key: this.#today, value: this.#newToday });
    }

    saveProgress(this.#env.store, this.#progress);
    saveCounts(this.#env.store, this.#counts);
    saveSeen(this.#env.store, { key: this.#today, value: this.#seen });
  }

  next(): void {
    this.#rollDay();
    this.#session = advance(this.#session, this.#input(), this.#deps());
    this.speak();
  }

  /** Czyta pytanie — ale nigdy tam, gdzie przeczytanie byłoby podaniem odpowiedzi. */
  speak(): void {
    if (this.#session.status !== "active") return;
    const current = this.#session.current;
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

  say(text: string): void {
    this.#env.speech.say(text);
  }

  sayIfOn(text: string): void {
    if (this.#voice) this.#env.speech.say(text);
  }

  sayCurrent(): void {
    if (this.#session.status === "active") this.#env.speech.say(this.#session.current.word.it);
  }

  /** Jeszcze jedna runda, poza planem dnia. */
  studyMore(): void {
    this.#extra = true;
    this.restart();
  }

  setVoice(on: boolean): void {
    this.#voice = on;
    saveVoice(this.#env.store, on);
  }
}
