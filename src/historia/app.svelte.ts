/**
 * Stan nauki historii. Ta sama architektura co reszta: domena liczy, a ten
 * plik spina ją z zapisem i zegarem.
 */

import type { Clock } from "../ports/clock.js";
import type { KeyValueStore } from "../ports/storage.js";
import type { DailyCounts, DateKey } from "../domain/types.js";
import { dateKeyOf, dayNumberOf, streakLength } from "../domain/day.js";
import { stateOf } from "../domain/scheduler.js";
import { systemRng } from "../domain/random.js";
import { trimHistory } from "../domain/stats.js";
import type { Fact, FactAnswer, FactProgress, FactQueueInput, FactSession } from "../domain/facts/types.js";
import {
  advanceFacts,
  answerFact,
  dueFacts,
  factSummary,
  freshFacts,
  startFacts,
} from "../domain/facts/session.js";
import { FACTS, inScope, type Scope } from "./facts.js";
import {
  loadSaved,
  saveCounts,
  saveLimit,
  saveNewDay,
  saveProgress,
  saveScope,
  type NewLimit,
} from "./storage.js";

export type HistoryEnv = { readonly store: KeyValueStore; readonly clock: Clock };

export class History {
  readonly all = FACTS;

  #env: HistoryEnv;
  #progress = $state<FactProgress>(new Map());
  #counts = $state<DailyCounts>(new Map());
  #today = $state<DateKey>("" as DateKey);
  #newToday = $state(0);
  #scope = $state<Scope>("all");
  #limit = $state<NewLimit>(10);
  #extra = $state(false);
  #session = $state<FactSession>({ status: "done", reason: "empty", nextDue: null, newInReserve: 0 });

  constructor(env: HistoryEnv) {
    this.#env = env;
    const saved = loadSaved(env.store);
    const today = dateKeyOf(env.clock.now());
    this.#progress = saved.progress;
    this.#counts = saved.counts;
    this.#today = today;
    this.#newToday = saved.newDay.key === today ? saved.newDay.value : 0;
    this.#scope = saved.scope;
    this.#limit = saved.limit;
    this.start();
  }

  get session(): FactSession {
    return this.#session;
  }
  get scope(): Scope {
    return this.#scope;
  }
  get limit(): NewLimit {
    return this.#limit;
  }
  get progress(): FactProgress {
    return this.#progress;
  }
  get doneToday(): number {
    return this.#counts.get(this.#today) ?? 0;
  }

  readonly facts = $derived.by(() => inScope(this.#scope));
  readonly summary = $derived.by(() => factSummary(this.#session));
  readonly streak = $derived.by(() => streakLength(this.#counts, this.#env.clock.now()));

  /** Ile faktów z zakresu już poznanych i ile z nich utrwalonych. */
  readonly known = $derived.by(() => this.facts.filter((f) => this.#progress.has(f.id)).length);
  readonly mastered = $derived.by(
    () => this.facts.filter((f) => stateOf(this.#progress.get(f.id)) === "mature").length,
  );
  /** Najważniejsze (pogrubione) z zakresu: ile poznanych na ile wszystkich. */
  readonly keyKnown = $derived.by(
    () => this.facts.filter((f) => f.key && this.#progress.has(f.id)).length,
  );
  readonly keyTotal = $derived.by(() => this.facts.filter((f) => f.key).length);

  #input(): FactQueueInput {
    return {
      facts: this.facts,
      progress: this.#progress,
      today: dayNumberOf(this.#env.clock.now()),
      newLimit: this.#limit,
      newDone: this.#newToday,
      extra: this.#extra,
    };
  }

  /** Ile czeka dziś: zaległe plus nowe do limitu. */
  readonly waiting = $derived.by(() => {
    const input = this.#input();
    return dueFacts(input).length + Math.min(freshFacts(input).length, Math.max(0, this.#limit - this.#newToday));
  });

  #rollDay(): void {
    const today = dateKeyOf(this.#env.clock.now());
    if (today === this.#today) return;
    this.#today = today;
    this.#newToday = 0;
    saveNewDay(this.#env.store, today, 0);
  }

  start(): void {
    this.#rollDay();
    this.#extra = false;
    this.#session = startFacts(this.#input(), FACTS, systemRng);
  }

  studyMore(): void {
    this.#rollDay();
    this.#extra = true;
    this.#session = startFacts(this.#input(), FACTS, systemRng);
  }

  answer(given: FactAnswer): void {
    const result = answerFact(this.#session, given, this.#input());
    if (result === null) return;
    this.#session = result.session;
    const progress = new Map(this.#progress);
    progress.set(result.fact.id, result.review);
    this.#progress = progress;
    saveProgress(this.#env.store, progress);
    if (result.wasNew) {
      this.#newToday += 1;
      saveNewDay(this.#env.store, this.#today, this.#newToday);
    }
    this.count();
  }

  /** Jedna odpowiedź więcej w dzisiejszym wyniku — także z osi czasu. */
  count(): void {
    this.#rollDay();
    const counts = new Map(this.#counts);
    counts.set(this.#today, (counts.get(this.#today) ?? 0) + 1);
    this.#counts = trimHistory(counts);
    saveCounts(this.#env.store, this.#counts);
  }

  next(): void {
    this.#rollDay();
    this.#session = advanceFacts(this.#session, this.#input(), FACTS, systemRng);
  }

  setScope(scope: Scope): void {
    this.#scope = scope;
    saveScope(this.#env.store, scope);
    this.start();
  }

  setLimit(limit: NewLimit): void {
    this.#limit = limit;
    saveLimit(this.#env.store, limit);
    this.start();
  }

  stateOf(fact: Fact): ReturnType<typeof stateOf> {
    return stateOf(this.#progress.get(fact.id));
  }
}
