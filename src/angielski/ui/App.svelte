<!-- Powłoka: działy do wybrania, trzy zakładki, gwiazdki. -->
<script lang="ts">
  import type { English } from "../app.svelte.js";
  import { CARDS, SECTIONS } from "../words.js";
  import Flash from "./Flash.svelte";
  import Game from "./Game.svelte";
  import List from "./List.svelte";

  type Props = { app: English };
  let { app }: Props = $props();

  type Tab = "cards" | "game" | "list";
  let tab = $state<Tab>("cards");
  const TABS: readonly (readonly [Tab, string])[] = [
    ["cards", "🃏 Fiszki"],
    ["game", "🎮 Gra"],
    ["list", "📖 Słówka"],
  ];
</script>

<div class="en-wrap">
  <header class="en-top">
    <h1>🇬🇧 Angielski <small>Unit 2</small></h1>
    <span class="stars-count" title="Zebrane gwiazdki" data-test="stars">⭐ {app.stars}</span>
  </header>

  <div class="chips-head">
    <span>Co ćwiczymy?</span>
    <button class="chip-all" aria-pressed={app.sections.size === SECTIONS.length} onclick={() => app.selectAll()}>
      ✨ wszystko
    </button>
  </div>
  <div class="chips" role="group" aria-label="Działy">
    {#each SECTIONS as s (s.id)}
      <button class="chip" aria-pressed={app.sections.has(s.id)} data-section={s.id} onclick={() => app.toggleSection(s.id)}>
        {s.icon} {s.label} <small>{CARDS.filter((c) => c.section === s.id).length}</small>
      </button>
    {/each}
  </div>

  <div class="en-tabs" role="tablist">
    {#each TABS as [id, label] (id)}
      <button role="tab" aria-selected={tab === id} onclick={() => (tab = id)}>{label}</button>
    {/each}
  </div>

  <section class="en-panel" data-test="panel-cards" hidden={tab !== "cards"}>
    <Flash {app} active={tab === "cards"} />
  </section>
  {#if tab === "game"}
    <section class="en-panel" data-test="panel-game"><Game {app} /></section>
  {:else if tab === "list"}
    <section class="en-panel" data-test="panel-list"><List {app} /></section>
  {/if}

  <p class="en-foot" data-test="stat">
    Umiesz {app.cards.filter((c) => app.known.has(c.en)).length} z {app.cards.length} słówek w wybranych działach
  </p>
  <footer class="en-foot">Słówka z „Wordlist” Unit 2 · lekcje 2.1, 2.2, 2.4, 2.5</footer>
</div>
