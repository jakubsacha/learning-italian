<!--
  Wskazywanie: ściąga 2×2 z zeszytu i gra. Na obrazku dziecko pokazuje rzecz
  blisko (👇, duża, tuż obok) albo daleko (👉, mała, na końcu drogi);
  w zdaniu luka na this / that / these / those.
-->
<script lang="ts">
  import type { English } from "../app.svelte.js";
  import {
    POINTERS,
    answerOf,
    blank,
    fill,
    pointRound,
    translation,
    why,
    type PointQuestion,
    type Pointer,
  } from "../pointing.js";
  import { starsFor } from "../deck.js";
  import { systemRng } from "../../domain/random.js";
  import Confetti from "../../ui/Confetti.svelte";

  type Props = { app: English };
  let { app }: Props = $props();

  let round = $state<readonly PointQuestion[]>(pointRound(systemRng));
  let index = $state(0);
  let picked = $state<Pointer | null>(null);
  let right = $state(0);
  let streak = $state(0);
  let burst = $state(0);
  let rules = $state(true);

  const current = $derived(round[index]);
  const finished = $derived(index >= round.length);
  const won = $derived(starsFor(right, round.length));

  function start(): void {
    round = pointRound(systemRng);
    index = 0;
    picked = null;
    right = 0;
    streak = 0;
  }

  function pick(word: Pointer): void {
    if (picked !== null || current === undefined) return;
    picked = word;
    app.say(fill(current.sentence, answerOf(current)));
    if (word === answerOf(current)) {
      right += 1;
      streak += 1;
      app.addStars(1);
      if (streak % 5 === 0) burst += 1;
    } else streak = 0;
  }

  function next(): void {
    if (picked === null) return;
    index += 1;
    picked = null;
    if (index >= round.length) {
      app.addStars(won);
      if (won >= 2) burst += 1;
    }
  }
</script>

<Confetti {burst} />

<details class="rule" bind:open={rules} data-test="rule">
  <summary>📒 Ściąga z zeszytu</summary>
  <div class="rule-grid">
    <span></span>
    <b>👇 blisko</b>
    <b>👉 daleko</b>
    <b class="row">1️⃣ jedna rzecz</b>
    <button onclick={() => app.say("this")}>This</button>
    <button onclick={() => app.say("that")}>That</button>
    <b class="row">🔢 wiele rzeczy</b>
    <button onclick={() => app.say("these")}>These</button>
    <button onclick={() => app.say("those")}>Those</button>
  </div>
  <p class="rule-tip">Jedna rzecz → <b>is</b>, wiele rzeczy → <b>are</b>: <i>This is my cat. These are my cats.</i></p>
</details>

{#if finished}
  <div class="finish" data-test="point-over">
    <div class="trophy">{"⭐".repeat(won) || "💪"}</div>
    <h2>{won === 3 ? "Mistrzyni wskazywania!" : won >= 1 ? "Super!" : "Dobra próba!"}</h2>
    <p data-test="point-score">Dobrze: {right} z {round.length}</p>
    <button class="big-btn good" data-test="point-again" onclick={start}>👉 Jeszcze raz</button>
  </div>
{:else if current !== undefined}
  <div class="game-top">
    <span data-test="point-progress">Zdanie {index + 1} z {round.length}</span>
    <span class="streak" class:hot={streak >= 3}>🔥 {streak}</span>
  </div>

  <div class="question point-q" data-test="point-question" data-far={current.far ? "1" : "0"}>
    <div class="scene" class:far={current.far} aria-label={current.far ? "daleko" : "blisko"}>
      <div class="kid">🧒<span class="hand">{current.far ? "👉" : "👇"}</span></div>
      <div class="near-spot">
        {#if !current.far}
          {#each { length: current.sentence.count } as _, i (i)}<span>{current.sentence.emoji}</span>{/each}
        {/if}
      </div>
      <div class="path" aria-hidden="true"></div>
      <div class="far-spot">
        {#if current.far}
          {#each { length: current.sentence.count } as _, i (i)}<span>{current.sentence.emoji}</span>{/each}
        {/if}
      </div>
    </div>
    <div class="sentence" data-test="sentence">{blank(current.sentence)}</div>
  </div>

  <div class="choices four">
    {#each POINTERS as w (w)}
      <button
        class="choice"
        class:ok={picked !== null && w === answerOf(current)}
        class:no={picked === w && w !== answerOf(current)}
        disabled={picked !== null}
        data-ok={w === answerOf(current) ? "1" : "0"}
        onclick={() => pick(w)}>{w}</button
      >
    {/each}
  </div>

  {#if picked !== null}
    <div class="point-verdict" class:good={picked === answerOf(current)} data-test="point-verdict">
      <b>{picked === answerOf(current) ? "Brawo! 🎉" : `Tu pasuje ${answerOf(current)}`}</b>
      <p class="full">{fill(current.sentence, answerOf(current))}</p>
      <p class="pl">{translation(current)}</p>
      <p class="why">{why(current)}</p>
    </div>
    <button class="big-btn show" data-test="point-next" onclick={next}>
      {index + 1 === round.length ? "Wynik 🏁" : "Dalej ➜"}
    </button>
  {/if}
{/if}
