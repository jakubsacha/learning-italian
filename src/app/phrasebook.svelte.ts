/**
 * Stan rozmówek. Ta sama architektura co nauka słów: domena liczy, ten plik
 * spina ją z zapisem, zegarem i mową. Dzienny wynik idzie do wspólnego licznika,
 * więc zdania liczą się do serii i do wspólnego celu tak samo jak fiszki.
 */

import type { Clock } from "../ports/clock.js";
import type { Speech } from "../ports/speech.js";
import type { KeyValueStore } from "../ports/storage.js";
import type { DateKey } from "../domain/types.js";
import { dateKeyOf, dayNumberOf } from "../domain/day.js";
import { isDue, stateOf } from "../domain/scheduler.js";
import { systemRng } from "../domain/random.js";
import type {
  Phrase,
  PhraseAnswer,
  PhraseProgress,
  PhraseQueueInput,
  PhraseSession,
  Scene,
  SceneId,
} from "../domain/phrases/types.js";
import {
  advancePhrases,
  answerPhrase,
  duePhrases,
  freshPhrases,
  phraseSummary,
  startPhrases,
  type PhraseDeps,
} from "../domain/phrases/session.js";
import type { PhraseGraded } from "../domain/phrases/types.js";
import { SCENES } from "../data/scenes.js";
import {
  loadPhrases,
  savePhraseDay,
  savePhraseLimit,
  savePhraseProgress,
  saveScene,
  type PhraseLimit,
} from "../storage/phrases.js";
import type { Learning } from "./learning.svelte.js";

export type PhrasebookEnv = {
  readonly store: KeyValueStore;
  readonly clock: Clock;
  readonly speech: Speech;
  /** Nauka słów — od niej bierzemy ustawienie wymowy i do niej doliczamy wynik dnia. */
  readonly learning: Learning;
};

export type SceneStats = {
  readonly scene: Scene;
  readonly known: number;
  readonly mastered: number;
  readonly due: number;
};

export class Phrasebook {
  readonly scenes = SCENES;

  #env: PhrasebookEnv;
  #progress = $state<PhraseProgress>(new Map());
  #today = $state<DateKey>("" as DateKey);
  #newToday = $state(0);
  #limit = $state<PhraseLimit>(5);
  #scene = $state<SceneId | null>(null);
  #extra = $state(false);
  #session = $state<PhraseSession>({ status: "done", reason: "empty", nextDue: null, newInReserve: 0 });
  /** Ostatnia ocena — ekran werdyktu pokazuje, czy dyktando było bez błędu, czy z literówką. */
  #lastGraded = $state<PhraseGraded | null>(null);

  constructor(env: PhrasebookEnv) {
    this.#env = env;
    const saved = loadPhrases(env.store);
    const today = dateKeyOf(env.clock.now());
    this.#progress = saved.progress;
    this.#today = today;
    this.#newToday = saved.newDay.key === today ? saved.newDay.value : 0;
    this.#limit = saved.limit;
    this.#scene = saved.scene !== null && SCENES.some((s) => s.id === saved.scene) ? saved.scene : null;
  }

  get session(): PhraseSession {
    return this.#session;
  }
  get limit(): PhraseLimit {
    return this.#limit;
  }
  get scene(): SceneId | null {
    return this.#scene;
  }
  get progress(): PhraseProgress {
    return this.#progress;
  }
  get lastGraded(): PhraseGraded | null {
    return this.#lastGraded;
  }
  get newToday(): number {
    return Math.min(this.#newToday, this.#limit);
  }

  readonly summary = $derived.by(() => phraseSummary(this.#session));

  readonly stats = $derived.by<readonly SceneStats[]>(() => {
    const today = dayNumberOf(this.#env.clock.now());
    return this.scenes.map((scene) => {
      let known = 0;
      let mastered = 0;
      let due = 0;
      for (const p of scene.phrases) {
        const review = this.#progress.get(p.id);
        if (review === undefined) continue;
        known += 1;
        if (stateOf(review) === "mature") mastered += 1;
        if (isDue(review, today)) due += 1;
      }
      return { scene, known, mastered, due };
    });
  });

  /** Ile czeka dziś: zaległe plus nowe do limitu. Liczba na przycisku „Ćwicz". */
  readonly waiting = $derived.by(() => {
    const input = this.#input();
    return duePhrases(input).length + Math.min(freshPhrases(input).length, Math.max(0, this.#limit - this.#newToday));
  });

  /** Sytuacja, z której przyjdą najbliższe nowe kwestie. */
  readonly currentScene = $derived.by<Scene | undefined>(() => {
    const next = freshPhrases(this.#input())[0];
    return next === undefined ? undefined : this.scenes.find((s) => s.id === next.scene);
  });

  #input(): PhraseQueueInput {
    return {
      scenes: this.scenes,
      progress: this.#progress,
      today: dayNumberOf(this.#env.clock.now()),
      newLimit: this.#limit,
      newDone: this.#newToday,
      scene: this.#scene,
      extra: this.#extra,
    };
  }

  #deps(): PhraseDeps {
    return { canListen: this.#env.speech.available, rng: systemRng };
  }

  #rollDay(): void {
    const today = dateKeyOf(this.#env.clock.now());
    if (today === this.#today) return;
    this.#today = today;
    this.#newToday = 0;
    savePhraseDay(this.#env.store, today, 0);
  }

  /** Nowa sesja: zaległe powtórki i nowe kwestie do dziennego limitu. */
  start(): void {
    this.#rollDay();
    this.#extra = false;
    this.#lastGraded = null;
    this.#session = startPhrases(this.#input(), this.#deps());
    this.speak();
  }

  /** Jeszcze kilka nowych kwestii, poza dziennym limitem. */
  studyMore(): void {
    this.#rollDay();
    this.#extra = true;
    this.#lastGraded = null;
    this.#session = startPhrases(this.#input(), this.#deps());
    this.speak();
  }

  answer(given: PhraseAnswer): void {
    const result = answerPhrase(this.#session, given, this.#input());
    if (result === null) return;
    this.#session = result.session;
    this.#lastGraded = result.graded;
    const progress = new Map(this.#progress);
    progress.set(result.phrase.id, result.review);
    this.#progress = progress;
    savePhraseProgress(this.#env.store, progress);
    // Pierwsze zetknięcie liczy się do dziennego limitu — także w paczce dodatkowej,
    // żeby jutro nie spadło na Ciebie dwa razy więcej.
    if (result.wasNew) {
      this.#newToday += 1;
      savePhraseDay(this.#env.store, this.#today, this.#newToday);
    }
    this.#env.learning.countAnswer();
  }

  next(): void {
    this.#rollDay();
    this.#lastGraded = null;
    this.#session = advancePhrases(this.#session, this.#input(), this.#deps());
    this.speak();
  }

  /** Nowe kwestie mają przychodzić z tej sytuacji. */
  chooseScene(scene: SceneId): void {
    this.#scene = scene;
    saveScene(this.#env.store, scene);
  }

  setLimit(limit: PhraseLimit): void {
    this.#limit = limit;
    savePhraseLimit(this.#env.store, limit);
  }

  /**
   * Czyta pytanie tam, gdzie słuch jest jego częścią. Przy mówieniu i rozsypance
   * milczy — przeczytana odpowiedź to żadne pytanie.
   */
  speak(): void {
    if (this.#session.status !== "active") return;
    const current = this.#session.current;
    if (current.kind === "listen" || current.kind === "dictation") {
      this.#env.speech.say(current.phrase.it);
      return;
    }
    if (current.kind === "read" && this.#env.learning.voice) this.#env.speech.say(current.phrase.it);
  }

  sayCurrent(): void {
    if (this.#session.status === "active") this.#env.speech.say(this.#session.current.phrase.it);
  }

  say(text: string): void {
    this.#env.speech.say(text);
  }

  /** Po odpowiedzi słychać poprawne zdanie, o ile wymowa jest włączona. */
  echo(phrase: Phrase): void {
    if (this.#env.learning.voice) this.#env.speech.say(phrase.it);
  }

  stateOf(phrase: Phrase): ReturnType<typeof stateOf> {
    return stateOf(this.#progress.get(phrase.id));
  }

  get canListen(): boolean {
    return this.#env.speech.available;
  }
}
