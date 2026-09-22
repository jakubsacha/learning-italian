/**
 * Konto i synchronizacja. Stan jest unią: albo chmura nie jest skonfigurowana,
 * albo jesteś wylogowany, albo zalogowany z tablicą wyników, albo coś poszło
 * nie tak. Nie da się być „zalogowanym bez nazwy" ani „z błędem i tablicą".
 */

import type { Clock } from "../ports/clock.js";
import type { KeyValueStore } from "../ports/storage.js";
import type { Credentials, SyncBackend } from "../ports/sync.js";
import type { BoardRow, DailyCounts, Sync, Username } from "../domain/types.js";

import { dateKeyOf } from "../domain/day.js";
import { boardRows, sharedGoal, type SharedGoal } from "../domain/board.js";
import { mergeCounts, mergeProgress } from "../domain/merge.js";
import { decodeCounts, decodeProgress, encodeCounts, encodeProgress } from "../storage/progress.js";
import { stateOf } from "../domain/scheduler.js";
import type { Learning } from "./learning.svelte.js";

/** Czyja nauka leży w tej przeglądarce — decyduje, czy scalać, czy brać z serwera. */
const OWNER_KEY = "it250.owner";
/** Zapis zbieramy w paczki: seria ocen to jeden zapis, a nie dziesięć. */
const PUSH_DELAY_MS = 1200;

export type CloudEnv = {
  readonly learning: Learning;
  readonly store: KeyValueStore;
  readonly clock: Clock;
  /** `null` znaczy: chmura nie jest skonfigurowana i zostajemy lokalnie. */
  readonly connect: () => Promise<SyncBackend | null>;
  /** Wspólny cel dzienny — wstrzyknięty, żeby dało się go przestawić w testach. */
  readonly goal: number;
};

export class Cloud {
  #env: CloudEnv;
  #backend: SyncBackend | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #state = $state<Sync>({ status: "unconfigured" });
  #goal = $state<SharedGoal>({ target: 0, total: 0, done: false, streak: 0 });
  #busy = $state(false);

  constructor(env: CloudEnv) {
    this.#env = env;
    this.#goal = { target: env.goal, total: 0, done: false, streak: 0 };
  }

  get state(): Sync {
    return this.#state;
  }
  get goal(): SharedGoal {
    return this.#goal;
  }
  get busy(): boolean {
    return this.#busy;
  }

  async start(): Promise<void> {
    try {
      this.#backend = await this.#env.connect();
    } catch {
      this.#state = { status: "error", message: "Nie udało się połączyć z chmurą." };
      return;
    }
    if (this.#backend === null) return;
    const username = await this.#backend.currentUser();
    if (username === null) this.#state = { status: "signed-out" };
    else await this.#adopt(username);
  }

  async signIn(credentials: Credentials): Promise<string | null> {
    return this.#enter((backend) => backend.signIn(credentials));
  }

  async signUp(credentials: Credentials): Promise<string | null> {
    return this.#enter((backend) => backend.signUp(credentials));
  }

  /** Zwraca komunikat błędu albo `null`, gdy się udało. */
  async #enter(
    attempt: (backend: SyncBackend) => Promise<{ ok: boolean; value?: Username; error?: string }>,
  ): Promise<string | null> {
    const backend = this.#backend;
    if (backend === null) return "Chmura jest niedostępna.";
    this.#busy = true;
    try {
      const result = await attempt(backend);
      if (!result.ok || result.value === undefined) return result.error ?? "Nie udało się.";
      await this.#adopt(result.value);
      return null;
    } finally {
      this.#busy = false;
    }
  }

  async signOut(): Promise<void> {
    if (this.#timer !== null) await this.flush();
    await this.#backend?.signOut();
    this.#state = { status: "signed-out" };
  }

  /** Zmiana postępu: zapis idzie z opóźnieniem, żeby nie strzelać przy każdej karcie. */
  push(): void {
    if (this.#state.status !== "signed-in") return;
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.flush(), PUSH_DELAY_MS);
  }

  async flush(): Promise<void> {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    const backend = this.#backend;
    if (backend === null || this.#state.status !== "signed-in") return;
    const result = await backend.save({
      srs: encodeProgress(this.#env.learning.progress),
      days: encodeCounts(this.#env.learning.counts),
      known: this.#mature(),
    });
    if (!result.ok) {
      this.#state = { status: "error", message: "Postęp zapisany lokalnie, ale nie w chmurze." };
      return;
    }
    await this.#refreshBoard();
  }

  #mature(): number {
    return this.#env.learning.deck.words.filter(
      (w) => stateOf(this.#env.learning.progress.get(w.id)) === "mature",
    ).length;
  }

  /**
   * Wejście na konto. Ta sama osoba w tej samej przeglądarce — scalamy, nic nie
   * ginie. Cudza albo świeża przeglądarka — obowiązuje stan z serwera, żeby nie
   * przykleić komuś cudzej nauki.
   */
  async #adopt(username: Username): Promise<void> {
    const backend = this.#backend;
    if (backend === null) return;
    this.#state = {
      status: "signed-in",
      username,
      board: [],
      goal: { target: this.#env.goal, total: 0, streak: 0 },
    };
    const row = await backend.loadOwn();
    const lastOwner = this.#env.store.read(OWNER_KEY);

    if (row === null) {
      await this.flush();
    } else if (lastOwner === username) {
      this.#env.learning.adopt(
        mergeProgress(this.#env.learning.progress, decodeProgress(row.srs)),
        mergeCounts(this.#env.learning.counts, decodeCounts(row.days)),
      );
      await this.flush();
    } else {
      this.#env.learning.adopt(decodeProgress(row.srs), decodeCounts(row.days));
    }
    this.#env.store.write(OWNER_KEY, username);
    await this.#refreshBoard();
  }

  async #refreshBoard(): Promise<void> {
    const backend = this.#backend;
    if (backend === null || this.#state.status !== "signed-in") return;
    const rows = await backend.loadAll();
    const now = this.#env.clock.now();
    const today = dateKeyOf(now);
    const everyone: DailyCounts[] = rows.map((r) => decodeCounts(r.days));
    const board: BoardRow[] = rows.map((r, i) => ({
      username: r.username,
      today: everyone[i]?.get(today) ?? 0,
      mature: r.known,
    }));
    this.#goal = sharedGoal(everyone, now, this.#env.goal);
    this.#state = {
      ...this.#state,
      board: boardRows(board),
      goal: { target: this.#goal.target, total: this.#goal.total, streak: this.#goal.streak },
    };
  }
}
