<!-- Powłoka: działy do wybrania, cztery zakładki, gwiazdki. -->
<script lang="ts">
  import type { English } from "../app.svelte.js";
  import { CARDS, SECTIONS } from "../words.js";
  import Flash from "./Flash.svelte";
  import Game from "./Game.svelte";
  import List from "./List.svelte";
  import Point from "./Point.svelte";

  type Props = { app: English };
  let { app }: Props = $props();

  let shared = $state("");

  /** Link do wysłania: na telefonie systemowe „Udostępnij", gdzie indziej kopia do schowka. */
  async function share(): Promise<void> {
    const url = location.origin + location.pathname;
    const data = { title: "Angielski · Unit 2", text: "Fiszki i gra ze słówkami z Unit 2 🇬🇧", url };
    try {
      if (navigator.share !== undefined) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      shared = "Skopiowano link! Wklej go koleżankom i kolegom.";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      shared = url;
    }
  }

  type Tab = "cards" | "game" | "point" | "list";
  let tab = $state<Tab>("cards");
  const TABS: readonly (readonly [Tab, string])[] = [
    ["cards", "🃏 Fiszki"],
    ["game", "🎮 Gra"],
    ["point", "👉 This/That"],
    ["list", "📖 Słówka"],
  ];
</script>

<div class="en-wrap">
  <header class="en-top">
    <h1>🇬🇧 Angielski <small>Unit 2</small></h1>
    <span class="stars-count" title="Zebrane gwiazdki" data-test="stars">⭐ {app.stars}</span>
  </header>

  <!-- Działy dotyczą słówek; wskazywanie ma własne zdania. -->
  {#if tab !== "point"}
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
  {/if}

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
  {:else if tab === "point"}
    <section class="en-panel" data-test="panel-point"><Point {app} /></section>
  {:else if tab === "list"}
    <section class="en-panel" data-test="panel-list"><List {app} /></section>
  {/if}

  <p class="en-foot" data-test="stat">
    Umiesz {app.cards.filter((c) => app.known.has(c.en)).length} z {app.cards.length} słówek w wybranych działach
  </p>
  <button class="share" data-test="share" onclick={share}>📤 Wyślij koleżankom i kolegom</button>
  {#if shared !== ""}<p class="en-foot" data-test="shared">{shared}</p>{/if}
  <p class="en-foot small">Każdy ma swój postęp — zapisuje się na jego telefonie lub tablecie.</p>
  <footer class="en-foot">Słówka z „Wordlist” Unit 2 · lekcje 2.1, 2.2, 2.4, 2.5</footer>
</div>
