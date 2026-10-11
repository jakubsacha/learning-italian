<!-- Powłoka: zakres materiału, pięć zakładek, wynik dnia. -->
<script lang="ts">
  import type { History } from "../app.svelte.js";
  import Learn from "./Learn.svelte";
  import Order from "./Order.svelte";
  import Timeline from "./Timeline.svelte";
  import Sides from "./Sides.svelte";
  import Notes from "./Notes.svelte";
  import { LESSONS, type Scope } from "../facts.js";
  import { LIMITS, type NewLimit } from "../storage.js";
  import { withCount } from "../../domain/text.js";

  type Props = { app: History };
  let { app }: Props = $props();

  type Tab = "learn" | "order" | "timeline" | "sides" | "notes";
  const TABS: readonly (readonly [Tab, string])[] = [
    ["learn", "Nauka"],
    ["order", "Kolejność"],
    ["timeline", "Oś czasu"],
    ["sides", "Kto z kim"],
    ["notes", "Ściąga"],
  ];
  let tab = $state<Tab>("learn");

  const SCOPES: readonly (readonly [Scope, string])[] = [
    ["all", "Cały rozdział"],
    [1, "Temat 1: " + LESSONS[1]],
    [2, "Temat 2: " + LESSONS[2]],
    [3, "Ciekawostki: " + LESSONS[3]],
  ];

  const parseScope = (v: string): Scope => (v === "1" ? 1 : v === "2" ? 2 : v === "3" ? 3 : "all");
</script>

<div class="wrap history-wrap">
  <header class="top">
    <h1>II wojna światowa</h1>
    <span class="score" title="Dni nauki z rzędu">🔥 {app.streak}</span>
  </header>

  <label class="scope">
    Zakres
    <select
      aria-label="Zakres materiału"
      value={String(app.scope)}
      onchange={(e) => app.setScope(parseScope(e.currentTarget.value))}
    >
      {#each SCOPES as [value, label] (value)}<option value={String(value)}>{label}</option>{/each}
    </select>
  </label>

  <div class="tabs" role="tablist">
    {#each TABS as [id, label] (id)}
      <button role="tab" aria-selected={tab === id} onclick={() => (tab = id)}>{label}</button>
    {/each}
  </div>

  <!-- Nauka zostaje w drzewie: zajrzenie do ściągi nie przerywa sesji. -->
  <section class="panel" data-test="panel-learn" hidden={tab !== "learn"}>
    <Learn {app} active={tab === "learn"} />
  </section>
  {#if tab === "order"}
    <section class="panel" data-test="panel-order"><Order {app} /></section>
  {:else if tab === "timeline"}
    <section class="panel" data-test="panel-timeline"><Timeline {app} /></section>
  {:else if tab === "sides"}
    <section class="panel" data-test="panel-sides"><Sides {app} /></section>
  {:else if tab === "notes"}
    <section class="panel" data-test="panel-notes"><Notes {app} /></section>
  {/if}

  <div class="sess-foot">
    <span data-test="stat">
      Dziś {withCount(app.doneToday, "odpowiedź", "odpowiedzi", "odpowiedzi")} · poznane
      {app.known}/{app.facts.length} · najważniejsze {app.keyKnown}/{app.keyTotal} · umiesz {app.mastered}
    </span>
    <label class="chk">
      Nowe fakty dziennie
      <select value={app.limit} onchange={(e) => app.setLimit(Number(e.currentTarget.value) as NewLimit)}>
        {#each LIMITS as limit (limit)}<option value={limit}>{limit}</option>{/each}
      </select>
    </label>
  </div>

  <footer>Na podstawie podręcznika: rozdział I „II wojna światowa”, s. 8–21</footer>
</div>
