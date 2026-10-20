<!--
  Fiszki: dotknij, żeby odwrócić. „Umiem!" zdejmuje kartę z talii,
  „Jeszcze raz" odkłada ją trzy karty dalej. Na końcu konfetti.
-->
<script lang="ts">
  import type { English } from "../app.svelte.js";
  import type { Card } from "../words.js";
  import { again } from "../deck.js";
  import { shuffle, systemRng } from "../../domain/random.js";
  import Picture from "./Picture.svelte";
  import Confetti from "./Confetti.svelte";
  import { untrack } from "svelte";

  type Props = { app: English; active: boolean };
  let { app, active }: Props = $props();

  type Dir = "en" | "pl";
  let dir = $state<Dir>("en");
  let queue = $state<readonly Card[]>([]);
  let total = $state(0);
  let flipped = $state(false);
  let tricky = $state<readonly Card[]>([]);
  let burst = $state(0);

  const current = $derived(queue[0]);
  const done = $derived(total - queue.length);

  function start(cards: readonly Card[]): void {
    queue = shuffle(cards, systemRng);
    total = cards.length;
    flipped = false;
    tricky = [];
  }

  function flip(): void {
    if (current === undefined) return;
    flipped = !flipped;
    if (flipped && dir === "pl") app.say(current.en);
  }

  function know(): void {
    if (current === undefined) return;
    app.setKnown(current, true);
    app.addStars(1);
    queue = queue.slice(1);
    flipped = false;
    if (queue.length === 0) burst += 1;
  }

  function retry(): void {
    if (current === undefined) return;
    const card = current;
    app.setKnown(card, false);
    if (!tricky.includes(card)) tricky = [...tricky, card];
    queue = again(queue);
    flipped = false;
  }

  function key(e: KeyboardEvent): void {
    if (!active || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      flip();
    } else if (flipped && e.key === "1") retry();
    else if (flipped && e.key === "2") know();
  }

  // Nowa talia przy zmianie działów.
  $effect(() => {
    const cards = app.cards;
    untrack(() => start(cards));
  });
</script>

<svelte:window onkeydown={key} />
<Confetti {burst} />

<div class="dir" role="group" aria-label="Kierunek">
  <button aria-pressed={dir === "en"} onclick={() => ((dir = "en"), (flipped = false))}>🇬🇧 → 🇵🇱</button>
  <button aria-pressed={dir === "pl"} onclick={() => ((dir = "pl"), (flipped = false))}>🇵🇱 → 🇬🇧</button>
</div>

{#if current !== undefined}
  <div class="progress" aria-label="Postęp">
    <div class="bar"><i style="width:{(done / Math.max(total, 1)) * 100}%"></i></div>
    <span data-test="count">{done} / {total}</span>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="flashcard" class:flipped onclick={flip} data-test="flashcard" data-word={current.en}>
    <div class="face front">
      <Picture art={current.art} />
      {#if dir === "en"}
        <div class="en">{current.en}</div>
        <div class="pr">czytaj: {current.pr}</div>
      {:else}
        <div class="pl">{current.pl}</div>
      {/if}
      <div class="hint">👆 dotknij, żeby odwrócić</div>
    </div>
    <div class="face back">
      <Picture art={current.art} size="small" />
      {#if dir === "en"}
        <div class="pl" data-test="answer">{current.pl}</div>
        <div class="en small">{current.en}</div>
      {:else}
        <div class="en" data-test="answer">{current.en}</div>
        <div class="pr">czytaj: {current.pr}</div>
      {/if}
    </div>
    <button
      class="say"
      aria-label="Przeczytaj po angielsku"
      onclick={(e) => {
        e.stopPropagation();
        app.say(current.en);
      }}>🔊</button
    >
  </div>

  {#if flipped}
    <div class="grade">
      <button class="big-btn again" data-test="again" onclick={retry}>🔁 Powtórz</button>
      <button class="big-btn good" data-test="know" onclick={know}>✅ Umiem!</button>
    </div>
  {:else}
    <button class="big-btn show" data-test="flip" onclick={flip}>Pokaż 🔄</button>
  {/if}
{:else}
  <div class="finish" data-test="finish">
    <div class="trophy">🏆</div>
    <h2>Brawo!</h2>
    <p>Przeszłaś wszystkie karty: {total}.{tricky.length > 0 ? ` Trudne: ${tricky.length}.` : " Bez ani jednej pomyłki!"}</p>
    {#if tricky.length > 0}
      <button class="big-btn good" data-test="tricky" onclick={() => start(tricky)}>🔁 Powtórz trudne ({tricky.length})</button>
    {/if}
    <button class="big-btn show" onclick={() => start(app.cards)}>🔀 Jeszcze raz wszystkie</button>
  </div>
{/if}
