<!--
  Gra „Co to?": obrazek i polskie słowo, cztery angielskie odpowiedzi.
  Dobra — gwiazdka i seria 🔥, zła — przycisk się trzęsie i pokazuje dobrą.
-->
<script lang="ts">
  import type { English } from "../app.svelte.js";
  import type { Card } from "../words.js";
  import { CARDS } from "../words.js";
  import { gameRound, options, starsFor } from "../deck.js";
  import { systemRng } from "../../domain/random.js";
  import Picture from "./Picture.svelte";
  import Confetti from "./Confetti.svelte";
  import { untrack } from "svelte";

  type Props = { app: English };
  let { app }: Props = $props();

  let round = $state<readonly Card[]>([]);
  let index = $state(0);
  let choices = $state<readonly Card[]>([]);
  let picked = $state<Card | null>(null);
  let right = $state(0);
  let streak = $state(0);
  let best = $state(0);
  let burst = $state(0);

  const current = $derived(round[index]);
  const finished = $derived(round.length > 0 && index >= round.length);
  const won = $derived(starsFor(right, round.length));

  function deal(): void {
    const card = round[index];
    // Odpowiedzi z całego materiału, gdy w wybranych działach jest za mało słówek.
    choices = card === undefined ? [] : options(card, app.cards.length >= 4 ? app.cards : CARDS, systemRng);
    picked = null;
  }

  function start(): void {
    round = gameRound(app.cards, systemRng);
    index = 0;
    right = 0;
    streak = 0;
    best = 0;
    deal();
  }

  function pick(c: Card): void {
    if (picked !== null || current === undefined) return;
    picked = c;
    app.say(current.en);
    if (c === current) {
      right += 1;
      streak += 1;
      best = Math.max(best, streak);
      app.addStars(1);
      if (streak % 5 === 0) burst += 1;
      setTimeout(next, 900);
    } else streak = 0;
  }

  function next(): void {
    if (picked === null) return;
    index += 1;
    if (index >= round.length) {
      if (won >= 2) burst += 1;
      app.addStars(won);
    }
    deal();
  }

  $effect(() => {
    void app.cards;
    untrack(start);
  });
</script>

<Confetti {burst} />

{#if finished}
  <div class="finish" data-test="game-over">
    <div class="trophy">{"⭐".repeat(won) || "💪"}</div>
    <h2>{won === 3 ? "Mistrzyni!" : won >= 1 ? "Super!" : "Dobra próba!"}</h2>
    <p data-test="game-score">Dobrze: {right} z {round.length} · najdłuższa seria: {best} 🔥</p>
    <button class="big-btn good" data-test="play-again" onclick={start}>🎮 Zagraj jeszcze raz</button>
  </div>
{:else if current !== undefined}
  <div class="game-top">
    <span>Pytanie {index + 1} z {round.length}</span>
    <span class="streak" class:hot={streak >= 3} data-test="streak">🔥 {streak}</span>
  </div>
  <div class="question" data-test="question">
    <Picture art={current.art} />
    <div class="pl">{current.pl}</div>
    <div class="ask">Jak to jest po angielsku?</div>
  </div>
  <div class="choices">
    {#each choices as c (c.en)}
      <button
        class="choice"
        class:ok={picked !== null && c === current}
        class:no={picked === c && c !== current}
        disabled={picked !== null}
        data-ok={c === current ? "1" : "0"}
        onclick={() => pick(c)}>{c.en}</button
      >
    {/each}
  </div>
  {#if picked !== null && picked !== current}
    <button class="big-btn show" data-test="game-next" onclick={next}>Dalej ➜</button>
  {/if}
{/if}
