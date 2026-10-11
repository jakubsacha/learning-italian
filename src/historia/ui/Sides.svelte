<!--
  Kto z kim: państwo na dużej karcie, trzy przyciski — alianci, Oś, neutralne.
  Po odpowiedzi wyjaśnienie z książki. Na końcu można powtórzyć same błędy.
-->
<script lang="ts">
  import type { History } from "../app.svelte.js";
  import { COUNTRIES, SIDES, SIDE_LABEL, USSR_NOTE, type Country, type Side } from "../sides.js";
  import { shuffle, systemRng } from "../../domain/random.js";

  type Props = { app: History };
  let { app }: Props = $props();

  type Mode = "play" | "map";
  let mode = $state<Mode>("play");

  let deck = $state<readonly Country[]>(shuffle(COUNTRIES, systemRng));
  let index = $state(0);
  let chosen = $state<Side | null>(null);
  let missed = $state<readonly Country[]>([]);

  const current = $derived(deck[index]);
  const right = $derived(deck.length - missed.length);

  function start(list: readonly Country[]): void {
    deck = shuffle(list, systemRng);
    index = 0;
    chosen = null;
    missed = [];
  }

  function answer(side: Side): void {
    if (chosen !== null || current === undefined) return;
    chosen = side;
    if (side !== current.side) missed = [...missed, current];
    app.count();
  }

  function next(): void {
    index += 1;
    chosen = null;
  }
</script>

<div class="modes" role="group" aria-label="Tryb">
  <button aria-pressed={mode === "play"} onclick={() => (mode = "play")}>Przypisz</button>
  <button aria-pressed={mode === "map"} onclick={() => (mode = "map")}>Podział</button>
</div>

{#if mode === "map"}
  <div class="sides-cols" data-test="sides-map">
    {#each SIDES as side (side)}
      <section class="side-col side-{side}">
        <h3>{SIDE_LABEL[side]}</h3>
        <ul>
          {#each COUNTRIES.filter((c) => c.side === side) as c (c.name)}<li>{c.name}</li>{/each}
        </ul>
      </section>
    {/each}
  </div>
  <p class="note ussr">{USSR_NOTE}</p>
{:else if current !== undefined}
  <p class="meta">Państwo {index + 1} z {deck.length}. Po której stronie było w latach 1939–1941?</p>
  <div class="country" data-test="country">{current.name}</div>

  <div class="side-buttons">
    {#each SIDES as side (side)}
      <button
        class="btn side-btn side-{side}"
        class:picked={chosen === side}
        class:right={chosen !== null && current.side === side}
        disabled={chosen !== null}
        onclick={() => answer(side)}>{SIDE_LABEL[side]}</button
      >
    {/each}
  </div>

  {#if chosen !== null}
    <div class="verdict" class:ok={chosen === current.side} class:no={chosen !== current.side} data-test="sides-verdict">
      {chosen === current.side ? "Dobrze!" : `Nie — ${SIDE_LABEL[current.side]}.`}
      <p class="why">{current.why} <small>(s. {current.page})</small></p>
    </div>
    <button class="btn nextq" data-test="sides-next" onclick={next}>Dalej</button>
  {/if}
{:else}
  <div class="verdict" class:ok={missed.length === 0} class:no={missed.length > 0} data-test="sides-done">
    Dobrze: {right} z {deck.length}.
    {#if missed.length > 0}
      Do powtórki: {missed.map((c) => c.name).join(", ")}.
    {/if}
  </div>
  {#if missed.length > 0}
    <button class="btn nextq" data-test="sides-retry" onclick={() => start(missed)}>Powtórz błędne</button>
  {/if}
  <button class="btn ghost nextq" onclick={() => start(COUNTRIES)}>Od nowa — wszystkie</button>
  <p class="note ussr">{USSR_NOTE}</p>
{/if}
