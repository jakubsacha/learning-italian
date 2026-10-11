<!--
  Kolejność: cała oś zdarzeń z wybranego zakresu na dużych klockach.
  „Poznaj" pokazuje ją od początku do końca, „Ułóż" każe odtworzyć ją z pamięci,
  klocek po klocku — zły klocek od razu się odbija.
-->
<script lang="ts">
  import type { History } from "../app.svelte.js";
  import { isDated, nextCandidates, type DatedFact } from "../../domain/facts/session.js";
  import { shuffle, systemRng } from "../../domain/random.js";
  import { untrack } from "svelte";

  type Props = { app: History };
  let { app }: Props = $props();

  /** Po tylu pomyłkach na jednym kroku podpowiadamy, który klocek jest następny. */
  const HINT_AFTER = 2;

  type Mode = "learn" | "build";
  let mode = $state<Mode>("learn");
  let showDates = $state(true);
  let revealed = $state<ReadonlySet<string>>(new Set());

  const events = $derived(
    app.facts.filter(isDated).sort((a, b) => a.event.when - b.event.when),
  );

  let pool = $state<readonly DatedFact[]>([]);
  let placed = $state<readonly DatedFact[]>([]);
  let mistakes = $state(0);
  let stepMistakes = $state(0);
  let wrong = $state<string | null>(null);

  const remaining = $derived(pool.filter((f) => !placed.includes(f)));
  const candidates = $derived(nextCandidates(remaining));
  const done = $derived(pool.length > 0 && remaining.length === 0);

  function restart(): void {
    pool = shuffle(events, systemRng);
    placed = [];
    mistakes = 0;
    stepMistakes = 0;
    wrong = null;
  }

  function tap(f: DatedFact): void {
    if (done || placed.includes(f)) return;
    if (candidates.includes(f)) {
      placed = [...placed, f];
      stepMistakes = 0;
      wrong = null;
      if (placed.length === pool.length) app.count();
    } else {
      mistakes += 1;
      stepMistakes += 1;
      wrong = f.id;
    }
  }

  function toggle(id: string): void {
    const next = new Set(revealed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    revealed = next;
  }

  // Nowe tasowanie tylko przy zmianie zakresu, nie przy każdej odpowiedzi.
  $effect(() => {
    void events;
    untrack(() => {
      restart();
      revealed = new Set();
    });
  });
</script>

<div class="modes" role="group" aria-label="Tryb">
  <button aria-pressed={mode === "learn"} onclick={() => (mode = "learn")}>Poznaj</button>
  <button aria-pressed={mode === "build"} onclick={() => (mode = "build")}>Ułóż</button>
</div>

{#if events.length < 2}
  <p class="meta">W tym zakresie jest za mało dat — wybierz inny temat.</p>
{:else if mode === "learn"}
  <p class="meta">Wydarzenia po kolei, od wybuchu wojny. {showDates ? "" : "Dotknij klocka, by zobaczyć datę."}</p>
  <label class="chk"><input type="checkbox" bind:checked={showDates} /> Pokaż daty</label>
  <ol class="blocks" data-test="order-list">
    {#each events as f (f.id)}
      <li>
        <button class="block" onclick={() => toggle(f.id)} disabled={showDates}>
          <span class="block-label">{f.event.label}</span>
          {#if showDates || revealed.has(f.id)}
            <b class="block-date">{f.a}</b>
          {:else}
            <b class="block-date hidden-date">?</b>
          {/if}
        </button>
      </li>
    {/each}
  </ol>
  <button class="btn nextq" onclick={() => (mode = "build")}>Sprawdź się — ułóż sam</button>
{:else}
  <p class="meta">Dotykaj klocków od najwcześniejszego wydarzenia. Ułożone {placed.length} z {pool.length}.</p>

  {#if placed.length > 0}
    <ol class="blocks placed" data-test="order-placed">
      {#each placed as f (f.id)}
        <li><div class="block ok"><span class="block-label">{f.event.label}</span><b class="block-date">{f.a}</b></div></li>
      {/each}
    </ol>
  {/if}

  {#if done}
    <div class="verdict" class:ok={mistakes === 0} class:no={mistakes > 0} data-test="order-done">
      {#if mistakes === 0}
        Bezbłędnie! Cała oś ułożona.
      {:else}
        Ułożone! Pomyłek po drodze: {mistakes}.
      {/if}
    </div>
    <button class="btn nextq" data-test="order-again" onclick={restart}>Jeszcze raz</button>
  {:else}
    <div class="blocks pool" data-test="order-pool">
      {#each remaining as f (f.id)}
        <button
          class="block"
          class:shake={wrong === f.id}
          class:hint={stepMistakes >= HINT_AFTER && candidates[0] === f}
          onclick={() => tap(f)}
          onanimationend={() => {
            if (wrong === f.id) wrong = null;
          }}
        >
          <span class="block-label">{f.event.label}</span>
        </button>
      {/each}
    </div>
    <p class="meta" data-test="order-mistakes">Pomyłki: {mistakes}</p>
  {/if}
{/if}
