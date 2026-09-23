<!-- Powłoka: nagłówek, zakładki, filtr materiału i stopka. -->
<script lang="ts">
  import type { Learning } from "../app/learning.svelte.js";
  import type { Cloud } from "../app/cloud.svelte.js";
  import type { KeyValueStore } from "../ports/storage.js";
  import { KEYS, type Theme } from "../storage/saved.js";
  import Study from "./Study.svelte";
  import Quiz from "./Quiz.svelte";
  import Phrases from "./phrases/Phrases.svelte";
  import type { Phrasebook } from "../app/phrasebook.svelte.js";
  import WordList from "./WordList.svelte";
  import Stats from "./Stats.svelte";
  import Sync from "./Sync.svelte";
  import { withCount } from "../domain/text.js";

  type Props = { app: Learning; book: Phrasebook; cloud: Cloud; store: KeyValueStore; now: Date };
  let { app, book, cloud, store, now }: Props = $props();

  type Tab = "mix" | "review" | "new" | "hard" | "phrases" | "quiz" | "list" | "stats";
  // Rodzaj sesji jest zapamiętany, więc zakładka wraca tam, gdzie ją zostawiłeś.
  // Celowo czytamy tylko wartość początkową: dalej zakładką steruje `select`.
  // svelte-ignore state_referenced_locally
  let tab = $state<Tab>(app.kind);

  /** Cztery zakładki nauki to ten sam panel — różnią się rodzajem sesji. */
  const isStudy = (t: Tab): t is "mix" | "review" | "new" | "hard" =>
    t === "mix" || t === "review" || t === "new" || t === "hard";

  function select(next: Tab): void {
    tab = next;
    if (isStudy(next)) app.setKind(next);
  }

  /**
   * Szerokość w dwunastu kolumnach paska: górny rząd to cztery zakładki nauki po 3,
   * dolny sumuje się do 12 według długości napisu — „ROZMÓWKI" potrzebuje więcej
   * miejsca niż „QUIZ", a na 320 px liczy się każdy piksel. Stąd też krótkie nazwy
   * na górze: „UTRWALANIE" i „NOWE SŁOWA" nie mieszczą się w czwartej części paska.
   */
  const TABS = $derived<readonly (readonly [Tab, string, number])[]>([
    ["mix", "Nauka", 3],
    ["review", "Powtórki", 3],
    ["new", "Nowe", 3],
    ["hard", app.leechCount > 0 ? "Trudne " + app.leechCount : "Trudne", 3],
    ["phrases", "Rozmówki", 4],
    ["quiz", "Quiz", 2],
    ["list", "Słowa", 3],
    ["stats", "Postęp", 3],
  ]);

  function toggleTheme(): void {
    const current = document.documentElement.getAttribute("data-theme");
    const next: Theme =
      current === "dark"
        ? "light"
        : current === "light"
          ? "dark"
          : matchMedia("(prefers-color-scheme: dark)").matches
            ? "light"
            : "dark";
    document.documentElement.setAttribute("data-theme", next);
    store.write(KEYS.theme, next);
  }

  const chosen = $derived(new Set(app.categories));
  const filterInfo = $derived(
    chosen.size === app.deck.categories.length
      ? "wszystkie kategorie"
      : withCount(chosen.size, "kategoria", "kategorie", "kategorii"),
  );
</script>

<div class="wrap">
  <header class="top">
    <h1>Włoski na co dzień</h1>
    <button class="theme-btn" onclick={toggleTheme}>◐ motyw</button>
  </header>

  <div class="tabs" role="tablist">
    {#each TABS as [id, label, span] (id)}
      <button
        role="tab"
        style="grid-column:span {span}"
        aria-selected={tab === id}
        onclick={() => select(id)}>{label}</button
      >
    {/each}
  </div>

  <!-- Filtr kategorii dotyczy słów; rozmówki mają swoje sytuacje. -->
  <details class="filters" hidden={tab === "phrases"}>
    <summary>Zakres materiału — <span>{filterInfo}</span></summary>
    <div class="chips">
      {#each app.deck.categories as category (category)}
        <button
          class="chip"
          class:on={chosen.has(category)}
          onclick={() => app.toggleCategory(category)}>{category}</button
        >
      {/each}
    </div>
    <div class="row" style="margin-top:10px">
      <button class="btn ghost" onclick={() => app.allCategories()}>Zaznacz wszystkie</button>
      <button class="btn ghost" onclick={() => app.noCategories()}>Odznacz wszystkie</button>
    </div>
  </details>

  <section class="panel" data-test="panel-study" hidden={!isStudy(tab)}>
    <Study {app} {now} active={isStudy(tab)} />
  </section>

  <!-- Też zostaje w drzewie: przełączenie zakładki nie przerywa rozpoczętej sesji. -->
  <section class="panel" data-test="panel-phrases" hidden={tab !== "phrases"}>
    <Phrases {book} {now} active={tab === "phrases"} />
  </section>

  {#if tab === "quiz"}
    <section class="panel" data-test="panel-quiz"><Quiz {app} /></section>
  {:else if tab === "list"}
    <section class="panel" data-test="panel-list"><WordList {app} /></section>
  {:else if tab === "stats"}
    <section class="panel" data-test="panel-stats"><Stats {app} /></section>
  {/if}

  <Sync {cloud} />

  <footer>
    {withCount(app.deck.words.length, "słowo", "słowa", "słów")} · wymowa zapisana polską fonetyką
    (przybliżona)
  </footer>
</div>
