<!-- Powłoka: unit, działy do wybrania, zakładki zależne od unitu, gwiazdki. -->
<script lang="ts">
  import type { English } from "../app.svelte.js";
  import { CARDS, UNITS, sectionsOf } from "../words.js";
  import Flash from "./Flash.svelte";
  import Game from "./Game.svelte";
  import List from "./List.svelte";
  import Point from "./Point.svelte";
  import Questions from "./Questions.svelte";
  import Rooms from "./Rooms.svelte";

  type Props = { app: English };
  let { app }: Props = $props();

  let shared = $state("");

  /** Link do wysłania: na telefonie systemowe „Udostępnij", gdzie indziej kopia do schowka. */
  async function share(): Promise<void> {
    const url = location.origin + location.pathname;
    const data = { title: "Angielski", text: "Fiszki i gry ze słówkami z angielskiego 🇬🇧", url };
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

  type Tab = "cards" | "game" | "point" | "ask" | "rooms" | "list";
  let tab = $state<Tab>("cards");
  /** Gramatyka z Unitu 2 zostaje przy nim; Unit 3 ma tylko swoje słówka i pokoje. */
  const TABS = $derived<readonly (readonly [Tab, string])[]>(
    app.unit === 2
      ? [
          ["cards", "🃏 Fiszki"],
          ["game", "🎮 Gra"],
          ["point", "👉 This/That"],
          ["ask", "❓ Pytania"],
          ["list", "📖 Słówka"],
        ]
      : [
          ["cards", "🃏 Fiszki"],
          ["game", "🎮 Gra"],
          ["rooms", "🏠 Pokoje"],
          ["list", "📖 Słówka"],
        ],
  );

  const SOURCE = { 2: "Słówka z „Wordlist” Unit 2 · lekcje 2.1, 2.2, 2.4, 2.5", 3: "Unit 3 · pokoje i meble z zeszytu" };

  function setUnit(u: 2 | 3): void {
    app.setUnit(u);
    if (!TABS.some(([id]) => id === tab)) tab = "cards";
  }
</script>

<div class="en-wrap">
  <header class="en-top">
    <h1>🇬🇧 Angielski</h1>
    <span class="stars-count" title="Zebrane gwiazdki" data-test="stars">⭐ {app.stars}</span>
  </header>

  <div class="units" role="group" aria-label="Unit">
    {#each UNITS as u (u)}
      <button aria-pressed={app.unit === u} data-unit={u} onclick={() => setUnit(u)}>Unit {u}</button>
    {/each}
  </div>

  <!-- Działy dotyczą słówek; wskazywanie, pytania i pokoje mają własne zadania. -->
  {#if tab !== "point" && tab !== "ask" && tab !== "rooms"}
  <div class="chips-head">
    <span>Co ćwiczymy?</span>
    <button class="chip-all" aria-pressed={app.active.size === sectionsOf(app.unit).length} onclick={() => app.selectAll()}>
      ✨ wszystko
    </button>
  </div>
  <div class="chips" class:three={app.unit === 3} role="group" aria-label="Działy">
    {#each sectionsOf(app.unit) as s (s.id)}
      <button class="chip" aria-pressed={app.active.has(s.id)} data-section={s.id} onclick={() => app.toggleSection(s.id)}>
        <span>{s.icon}</span> {s.label} <small>{CARDS.filter((c) => c.section === s.id).length}</small>
      </button>
    {/each}
  </div>
  {/if}

  <div class="en-tabs" class:four={TABS.length === 4} role="tablist">
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
  {:else if tab === "ask"}
    <section class="en-panel" data-test="panel-ask"><Questions {app} /></section>
  {:else if tab === "rooms"}
    <section class="en-panel" data-test="panel-rooms"><Rooms {app} /></section>
  {:else if tab === "list"}
    <section class="en-panel" data-test="panel-list"><List {app} /></section>
  {/if}

  <p class="en-foot" data-test="stat">
    Umiesz {app.cards.filter((c) => app.known.has(c.en)).length} z {app.cards.length} słówek w wybranych działach
  </p>
  {#if app.unit === 3}
    <a class="share print" href="unit3-dom.pdf" target="_blank" rel="noopener" data-test="print">🖨️ Karta pracy do druku (PDF)</a>
  {/if}
  <button class="share" data-test="share" onclick={share}>📤 Wyślij koleżankom i kolegom</button>
  {#if shared !== ""}<p class="en-foot" data-test="shared">{shared}</p>{/if}
  <p class="en-foot small">Każdy ma swój postęp — zapisuje się na jego telefonie lub tablecie.</p>
  <footer class="en-foot">{SOURCE[app.unit]}</footer>
</div>
