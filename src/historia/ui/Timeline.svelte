<!--
  Oś czasu: cztery wydarzenia do ułożenia od najwcześniejszego. Bez powtórek —
  to gra na zrozumienie, co było przed czym, a nie na pamięć pojedynczej daty.
-->
<script lang="ts">
  import type { History } from "../app.svelte.js";
  import {
    chronological,
    timelineRight,
    timelineRound,
    type DatedFact,
  } from "../../domain/facts/session.js";
  import { systemRng } from "../../domain/random.js";
  import { untrack } from "svelte";

  type Props = { app: History };
  let { app }: Props = $props();

  let round = $state<readonly DatedFact[]>([]);
  let placed = $state<readonly DatedFact[]>([]);
  let checked = $state<boolean | null>(null);
  let score = $state({ right: 0, played: 0 });

  function newRound(): void {
    round = timelineRound(app.facts, systemRng);
    placed = [];
    checked = null;
  }

  function place(f: DatedFact): void {
    if (checked !== null || placed.includes(f)) return;
    placed = [...placed, f];
    if (placed.length === round.length) {
      const right = timelineRight(placed);
      checked = right;
      score = { right: score.right + (right ? 1 : 0), played: score.played + 1 };
      app.count();
    }
  }

  // Nowa runda tylko przy zmianie zakresu, nie przy każdej zmianie postępu.
  $effect(() => {
    void app.facts;
    untrack(newRound);
  });
</script>

<p class="meta">Ułóż wydarzenia od najwcześniejszego. Klikaj po kolei.</p>

{#if round.length < 2}
  <p class="meta">W tym zakresie jest za mało dat — wybierz inny temat.</p>
{:else}
  <ol class="timeline-slot" data-test="slot">
    {#each placed as f, i (f.id)}
      {@const ok = checked !== null && chronological(round)[i]?.id === f.id}
      <li class:ok={checked !== null && ok} class:no={checked !== null && !ok}>
        <span>{f.event.label}</span>
        {#if checked !== null}<b>{f.a}</b>{/if}
      </li>
    {/each}
  </ol>

  {#if checked === null}
    <div class="timeline-pool" data-test="pool">
      {#each round as f (f.id)}
        <button class="tile" class:used={placed.includes(f)} disabled={placed.includes(f)} onclick={() => place(f)}>
          {f.event.label}
        </button>
      {/each}
    </div>
    {#if placed.length > 0}
      <button class="btn ghost" onclick={() => (placed = [])}>Zacznij od nowa</button>
    {/if}
  {:else}
    <div class="verdict" class:ok={checked} class:no={!checked}>
      {#if checked}
        Brawo, dobra kolejność!
      {:else}
        Nie tym razem. Dobra kolejność:
        <ol>
          {#each chronological(round) as f (f.id)}<li>{f.a} — {f.event.label}</li>{/each}
        </ol>
      {/if}
    </div>
    <button class="btn nextq" data-test="next" onclick={newRound}>Następna runda</button>
  {/if}
{/if}

<p class="meta" data-test="score">Ułożone dobrze: {score.right} z {score.played}</p>
