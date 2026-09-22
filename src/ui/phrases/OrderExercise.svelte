<!-- Rozsypanka: polskie zdanie na górze, włoskie do ułożenia z klocków. -->
<script lang="ts">
  import type { Phase } from "../../domain/types.js";
  import type { Phrase, Tile } from "../../domain/phrases/types.js";
  import Verdict from "../exercises/Verdict.svelte";

  type Props = {
    phrase: Phrase;
    tiles: readonly Tile[];
    phase: Phase;
    oncheck: (placed: readonly string[]) => void;
    onnext: () => void;
  };
  let { phrase, tiles, phase, oncheck, onnext }: Props = $props();

  let placed = $state<readonly Tile[]>([]);
  const answered = $derived(phase.phase === "answered");

  // Nowe zdanie — pusty rząd.
  $effect(() => {
    void phrase;
    placed = [];
  });

  const used = (tile: Tile): boolean => placed.some((p) => p.slot === tile.slot);
</script>

<div class="card ask" data-view="p-order" data-phrase={phrase.it}>
  <div class="ask-lead">Ułóż po włosku</div>
  <div class="ask-main">{phrase.pl}</div>
</div>

<div class="slot" data-test="slot">
  {#each placed as tile, i (tile.slot)}
    <button
      class="tile"
      disabled={answered}
      onclick={() => (placed = placed.filter((_, j) => j !== i))}>{tile.text}</button
    >
  {/each}
</div>
<div class="pool" data-test="pool">
  {#each tiles as tile (tile.slot)}
    <button
      class="tile"
      class:used={used(tile)}
      disabled={answered || used(tile)}
      onclick={() => (placed = [...placed, tile])}>{tile.text}</button
    >
  {/each}
</div>

{#if phase.phase === "answered"}
  <Verdict
    correct={phase.correct}
    text={(phase.correct ? "Brawo! " : "Poprawnie: ") + phrase.it}
    {onnext}
  />
{:else}
  <div class="row" style="margin-top:14px">
    <button
      class="btn"
      data-test="check"
      disabled={placed.length === 0}
      onclick={() => oncheck(placed.map((t) => t.text))}>Sprawdź</button
    >
    <button class="btn ghost" disabled={placed.length === 0} onclick={() => (placed = [])}>
      Wyczyść
    </button>
  </div>
{/if}
