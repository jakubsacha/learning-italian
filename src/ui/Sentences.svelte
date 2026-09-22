<!-- Zdania: rozsypanka albo luka. Poziom rośnie razem z poznanym materiałem. -->
<script lang="ts">
  import type { Learning } from "../app/learning.svelte.js";
  import type { Sentence } from "../domain/types.js";
  import { sentencesUpTo } from "../data/deck.js";
  import { normalise, splitGap } from "../domain/text.js";
  import { untrack } from "svelte";
  import { pick, shuffle, systemRng } from "../domain/random.js";

  type Props = { app: Learning };
  let { app }: Props = $props();

  type Tile = { readonly text: string; readonly slot: number };

  let mode = $state<"order" | "gap">("order");
  let sentence = $state<Sentence | null>(null);
  let tiles = $state<readonly Tile[]>([]);
  let placed = $state<readonly Tile[]>([]);
  let checked = $state(false);
  let gapChoices = $state<readonly string[]>([]);
  let gapPick = $state<string | null>(null);
  let done = $state(0);
  let correct = $state(0);

  const pool = $derived(sentencesUpTo(app.level));

  function nextSentence(): void {
    const first = pool[0];
    if (first === undefined) return;
    const next = pick([first, ...pool.slice(1)], systemRng);
    sentence = next;
    placed = [];
    checked = false;
    gapPick = null;
    tiles = shuffle(
      next.it.split(" ").map((text, slot) => ({ text, slot })),
      systemRng,
    );
    const others = shuffle(
      [...new Set(pool.map((s) => s.gap))].filter((g) => g !== next.gap),
      systemRng,
    ).slice(0, 3);
    gapChoices = shuffle([next.gap, ...others], systemRng);
  }

  function check(): void {
    if (checked || placed.length === 0 || sentence === null) return;
    checked = true;
    done += 1;
    if (normalise(placed.map((t) => t.text).join(" ")) === normalise(sentence.it)) correct += 1;
    if (app.voice) app.say(sentence.it);
  }

  function chooseGap(option: string): void {
    if (gapPick !== null || sentence === null) return;
    gapPick = option;
    done += 1;
    if (option === sentence.gap) correct += 1;
    if (app.voice) app.say(sentence.it);
  }

  const guessedRight = $derived(
    sentence !== null &&
      normalise(placed.map((t) => t.text).join(" ")) === normalise(sentence.it),
  );

  // Jak w Quizie: zmiana trybu albo poziomu losuje nowe zdanie, nic innego.
  $effect(() => {
    void mode;
    void pool;
    untrack(nextSentence);
  });
</script>

<div class="row" style="margin-bottom:12px">
  <select bind:value={mode} aria-label="Rodzaj ćwiczenia">
    <option value="order">Ułóż zdanie z rozsypanki</option>
    <option value="gap">Uzupełnij lukę</option>
  </select>
  <span class="meta">{done > 0 ? "Wynik: " + correct + " / " + done : ""}</span>
</div>

{#if sentence !== null}
  {@const current = sentence}
  {#if mode === "order"}
    <div class="card">
      <div class="prompt-pl">{current.pl}</div>
      <div class="meta" style="margin-bottom:10px">Ułóż zdanie po włosku</div>
      <div class="slot">
        {#each placed as tile, i (tile.slot)}
          <button
            class="tile"
            disabled={checked}
            onclick={() => (placed = placed.filter((_, j) => j !== i))}>{tile.text}</button
          >
        {/each}
      </div>
      <div class="pool">
        {#each tiles as tile (tile.slot)}
          <button
            class="tile"
            class:used={placed.some((p) => p.slot === tile.slot)}
            disabled={checked}
            onclick={() => (placed = [...placed, tile])}>{tile.text}</button
          >
        {/each}
      </div>
      {#if checked}
        <div class="verdict" class:ok={guessedRight} class:no={!guessedRight}>
          {guessedRight ? "Brawo! " : "Poprawnie: "}{current.it}
        </div>
      {/if}
      <div class="row" style="margin-top:14px">
        <button class="btn" disabled={checked} onclick={check}>Sprawdź</button>
        <button class="btn ghost" disabled={checked} onclick={() => (placed = [])}>Wyczyść</button>
        <button class="btn ghost" onclick={nextSentence}>Następne</button>
      </div>
    </div>
  {:else}
    {@const split = splitGap(current.it, current.gap)}
    <div class="card">
      <div class="prompt-pl">{current.pl}</div>
      <div class="gapline">
        {split.before}<b>{gapPick === null ? " " : current.gap}</b>{split.after}
      </div>
      <div class="opts">
        {#each gapChoices as option (option)}
          <button
            class="opt"
            class:ok={gapPick !== null && option === current.gap}
            class:no={gapPick === option && option !== current.gap}
            disabled={gapPick !== null}
            onclick={() => chooseGap(option)}>{option}</button
          >
        {/each}
      </div>
      {#if gapPick !== null}
        {@const good = gapPick === current.gap}
        <div class="verdict" class:ok={good} class:no={!good}>
          {good ? "Dobrze!" : "Poprawnie: " + current.gap}
        </div>
        <div class="row" style="margin-top:14px">
          <button class="btn" onclick={nextSentence}>Następne</button>
        </div>
      {/if}
    </div>
  {/if}
{/if}
