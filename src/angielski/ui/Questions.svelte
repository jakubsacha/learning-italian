<!--
  Pytania przez inwersję: ściąga, układanie pytań z klocków, krótkie
  odpowiedzi i zgadywanka „Kto to?" z tabelki z ćwiczenia 9.
-->
<script lang="ts">
  import type { English } from "../app.svelte.js";
  import {
    ITEMS,
    SUSPECTS,
    TRAITS,
    answerChoices,
    built,
    fits,
    guessStars,
    question,
    reply,
    sentenceOf,
    shortAnswer,
    statement,
    tiles,
    type Asked,
    type Item,
    type Suspect,
    type Tile,
    type Trait,
  } from "../questions.js";
  import { starsFor } from "../deck.js";
  import { shuffle, systemRng } from "../../domain/random.js";
  import Confetti from "../../ui/Confetti.svelte";

  type Props = { app: English };
  let { app }: Props = $props();

  type Mode = "build" | "answer" | "guess";
  let mode = $state<Mode>("build");
  let burst = $state(0);

  const ROUND = 8;

  /* ---- wspólna runda dla „Ułóż" i „Odpowiedz" ---- */
  let items = $state<readonly Item[]>([]);
  let index = $state(0);
  let right = $state(0);
  let done = $state<boolean | null>(null);

  const item = $derived(items[index]);
  const finished = $derived(items.length > 0 && index >= items.length);
  const won = $derived(starsFor(right, items.length));

  function startRound(): void {
    items = shuffle(ITEMS, systemRng).slice(0, ROUND);
    index = 0;
    right = 0;
    prepare();
  }

  function score(ok: boolean): void {
    done = ok;
    if (ok) {
      right += 1;
      app.addStars(1);
    }
  }

  function next(): void {
    index += 1;
    if (index >= items.length) {
      app.addStars(won);
      if (won >= 2) burst += 1;
    } else prepare();
  }

  /* ---- Ułóż pytanie ---- */
  let pool = $state<readonly Tile[]>([]);
  let placed = $state<readonly Tile[]>([]);

  /* ---- Krótka odpowiedź ---- */
  let yes = $state(true);
  let options = $state<readonly string[]>([]);
  let chosen = $state<string | null>(null);

  function prepare(): void {
    const it = items[index];
    done = null;
    if (it === undefined) return;
    pool = tiles(it, systemRng);
    placed = [];
    yes = systemRng() < 0.5;
    options = answerChoices(it, yes, systemRng);
    chosen = null;
  }

  function place(t: Tile): void {
    if (done !== null || placed.includes(t) || item === undefined) return;
    placed = [...placed, t];
    if (placed.length === 3) {
      score(built(placed));
      app.say(question(item));
    }
  }

  function choose(text: string): void {
    if (chosen !== null || item === undefined) return;
    chosen = text;
    score(text === shortAnswer(item, yes));
    app.say(`${question(item)} ${shortAnswer(item, yes)}`);
  }

  /* ---- Kto to? ---- */
  // Po imieniu, nie po obiekcie: $state opakowuje obiekty i `===` przestaje działać.
  let secretName = $state("Don");
  let log = $state<readonly Asked[]>([]);
  let guessed = $state<string | null>(null);
  const secret = $derived(SUSPECTS.find((s) => s.name === secretName) ?? (SUSPECTS[0] as Suspect));

  function startGuess(): void {
    secretName = shuffle(SUSPECTS, systemRng)[0]?.name ?? secretName;
    log = [];
    guessed = null;
  }

  function ask(t: Trait, text: string): void {
    if (guessed !== null || log.some((a) => a.trait === t)) return;
    log = [...log, { trait: t, yes: secret.is.has(t) }];
    app.say(`${text} ${reply(secret, t)}`);
  }

  function guess(s: Suspect): void {
    if (guessed !== null) return;
    guessed = s.name;
    const stars = guessStars(log.length, s.name === secretName);
    app.addStars(stars);
    if (stars >= 2) burst += 1;
  }

  function setMode(m: Mode): void {
    mode = m;
    if (m === "guess") startGuess();
    else startRound();
  }

  startRound();
  startGuess();
</script>

<Confetti {burst} />

<details class="rule" data-test="q-rule">
  <summary>📒 Jak zadać pytanie?</summary>
  <p class="q-flip"><span>You <b>are</b> happy.</span> ➜ <span><b>Are</b> you happy?</span></p>
  <p class="rule-tip">Czasownik <b>am / is / are</b> przeskakuje na początek. Odpowiadamy krótko:</p>
  <table class="q-table">
    <tbody>
      <tr><td>Are you…?</td><td>Yes, I am.</td><td>No, I'm not.</td></tr>
      <tr><td>Am I…?</td><td>Yes, you are.</td><td>No, you aren't.</td></tr>
      <tr><td>Is he / she / it…?</td><td>Yes, he is.</td><td>No, he isn't.</td></tr>
      <tr><td>Are we / they…?</td><td>Yes, they are.</td><td>No, they aren't.</td></tr>
    </tbody>
  </table>
  <p class="rule-tip">⚠️ Przy „Yes” bez skrótu: <b>Yes, I am.</b> — nigdy „Yes, I'm.”</p>
</details>

<div class="dir three" role="group" aria-label="Tryb">
  <button aria-pressed={mode === "build"} data-test="q-build" onclick={() => setMode("build")}>🧱 Ułóż</button>
  <button aria-pressed={mode === "answer"} data-test="q-answer" onclick={() => setMode("answer")}>💬 Odpowiedz</button>
  <button aria-pressed={mode === "guess"} data-test="q-guess" onclick={() => setMode("guess")}>🕵️ Kto to?</button>
</div>

{#if mode === "guess"}
  <div class="question" data-test="guess">
    <p class="ask">Ktoś z tabelki jest ukryty. Zadawaj pytania i zgadnij kto to — im mniej pytań, tym więcej ⭐.</p>
    <div class="suspects">
      {#each SUSPECTS as s (s.name)}
        <button
          class="suspect"
          class:out={!fits(s, log)}
          class:hit={guessed !== null && s.name === secretName}
          class:miss={guessed === s.name && s.name !== secretName}
          disabled={guessed !== null}
          data-name={s.name}
          onclick={() => guess(s)}
        >
          <span class="mug">{s.face}</span>{s.name}
        </button>
      {/each}
    </div>
  </div>
  {#if guessed === null}
    <div class="asks">
      {#each TRAITS as t (t.id)}
        <button
          class="choice"
          disabled={log.some((a) => a.trait === t.id)}
          data-trait={t.id}
          onclick={() => ask(t.id, t.ask)}>{t.ask}</button
        >
      {/each}
    </div>
  {/if}
  {#if log.length > 0}
    <ul class="q-log" data-test="guess-log">
      {#each log as a (a.trait)}
        <li>
          <b>{TRAITS.find((t) => t.id === a.trait)?.ask}</b>
          <span class:yes={a.yes}>{a.yes ? "Yes, he is." : "No, he isn't."}</span>
        </li>
      {/each}
    </ul>
  {/if}
  {#if guessed !== null}
    <div class="point-verdict" class:good={guessed === secretName} data-test="guess-verdict">
      <b>{guessed === secretName ? `Brawo! To ${secretName} 🎉` : `Nie — to był ${secretName}`}</b>
      <p>Pytań: {log.length} · ⭐ {guessStars(log.length, guessed === secretName)}</p>
    </div>
    <button class="big-btn show" data-test="guess-again" onclick={startGuess}>🕵️ Jeszcze raz</button>
  {/if}
{:else if finished}
  <div class="finish" data-test="q-over">
    <div class="trophy">{"⭐".repeat(won) || "💪"}</div>
    <h2>{won === 3 ? "Mistrzyni pytań!" : won >= 1 ? "Super!" : "Dobra próba!"}</h2>
    <p data-test="q-score">Dobrze: {right} z {items.length}</p>
    <button class="big-btn good" onclick={startRound}>🔁 Jeszcze raz</button>
  </div>
{:else if item !== undefined}
  <div class="game-top"><span data-test="q-progress">{index + 1} z {items.length}</span></div>

  {#if mode === "build"}
    <div class="question" data-test="build">
      <p class="ask">Zamień zdanie w pytanie:</p>
      <div class="pl">{statement(item)}</div>
      <div class="slot" data-test="slot">{sentenceOf(placed) || "…"}</div>
    </div>
    {#if done === null}
      <div class="tiles-row">
        {#each pool as t (t.text + t.role)}
          <button class="tile-btn" class:used={placed.includes(t)} disabled={placed.includes(t)} data-role={t.role} onclick={() => place(t)}>
            {t.text}
          </button>
        {/each}
      </div>
      {#if placed.length > 0}<button class="big-btn again" onclick={() => (placed = [])}>↩️ Od nowa</button>{/if}
    {:else}
      <div class="point-verdict" class:good={done} data-test="q-verdict">
        <b>{done ? "Brawo! 🎉" : "Prawie! Tak będzie dobrze:"}</b>
        <p class="q-flip">
          <span>{statement(item)}</span> ➜ <span><b>{question(item).split(" ")[0]}</b> {question(item).split(" ").slice(1).join(" ")}</span>
        </p>
        <p class="pl">{item.pl}</p>
      </div>
      <button class="big-btn show" data-test="q-next" onclick={next}>Dalej ➜</button>
    {/if}
  {:else}
    <div class="question" data-test="answer">
      <div class="sentence">{question(item)}</div>
      <p class="pl">{item.pl}</p>
      <div class="truth" class:no={!yes} data-test="truth">{yes ? "✅ tak" : "❌ nie"}</div>
    </div>
    <div class="choices">
      {#each options as o (o)}
        <button
          class="choice"
          class:ok={chosen !== null && o === shortAnswer(item, yes)}
          class:no={chosen === o && o !== shortAnswer(item, yes)}
          disabled={chosen !== null}
          data-ok={o === shortAnswer(item, yes) ? "1" : "0"}
          onclick={() => choose(o)}>{o}</button
        >
      {/each}
    </div>
    {#if chosen !== null}
      <div class="point-verdict" class:good={done === true} data-test="q-verdict">
        <b>{done ? "Brawo! 🎉" : `Dobrze: ${shortAnswer(item, yes)}`}</b>
        <p>{question(item)} — {shortAnswer(item, yes)}</p>
      </div>
      <button class="big-btn show" data-test="q-next" onclick={next}>Dalej ➜</button>
    {/if}
  {/if}
{/if}
