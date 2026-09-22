<!--
  Zakładka Rozmówki. Trzy widoki, jeden naraz — unia, a nie zestaw flag:
  lista sytuacji, sesja powtórek albo jedna scenka jako dialog.
-->
<script lang="ts">
  import type { Phrasebook } from "../../app/phrasebook.svelte.js";
  import type { SceneId } from "../../domain/phrases/types.js";
  import { PHRASE_LIMITS, type PhraseLimit } from "../../storage/phrases.js";
  import PhrasePractice from "./PhrasePractice.svelte";
  import SceneView from "./SceneView.svelte";
  import { percent } from "../format.js";
  import { withCount } from "../../domain/text.js";

  type Props = { book: Phrasebook; now: Date; active: boolean };
  let { book, now, active }: Props = $props();

  type View = { readonly view: "menu" } | { readonly view: "practice" } | { readonly view: "scene"; readonly id: SceneId };
  let view = $state<View>({ view: "menu" });

  const kwestie = (n: number): string => withCount(n, "kwestia", "kwestie", "kwestii");

  function practise(): void {
    book.start();
    view = { view: "practice" };
  }

  function learnScene(id: SceneId): void {
    book.chooseScene(id);
    practise();
  }

  // Id wyciągamy przed wywołaniem zwrotnym — wewnątrz niego TypeScript nie
  // pamięta już, że `view` to akurat scenka.
  const sceneId = $derived(view.view === "scene" ? view.id : null);
  const scene = $derived(sceneId === null ? undefined : book.scenes.find((s) => s.id === sceneId));
</script>

{#if view.view === "practice"}
  <PhrasePractice {book} {now} {active} onback={() => (view = { view: "menu" })} />
{:else if view.view === "scene" && scene !== undefined}
  <SceneView
    {book}
    {scene}
    onback={() => (view = { view: "menu" })}
    onlearn={() => learnScene(scene.id)}
  />
{:else}
  <div class="card phrase-start" data-view="p-menu">
    <b data-test="waiting">
      {book.waiting > 0 ? "Dziś czeka " + kwestie(book.waiting) : "Na dziś nic nie czeka"}
    </b>
    {#if book.currentScene !== undefined}
      <p class="meta">
        Nowe przychodzą z sytuacji: {book.currentScene.icon}
        {book.currentScene.title}
      </p>
    {/if}
    <div class="row">
      {#if book.waiting > 0}
        <button class="btn good" data-test="practise" onclick={practise}>Ćwicz</button>
      {:else}
        <button class="btn ghost" data-test="more" onclick={() => { book.studyMore(); view = { view: "practice" }; }}>
          Jeszcze kilka nowych
        </button>
      {/if}
      <label class="meta">
        Nowe kwestie dziennie
        <select
          value={book.limit}
          onchange={(e) => book.setLimit(Number(e.currentTarget.value) as PhraseLimit)}
        >
          {#each PHRASE_LIMITS as limit (limit)}<option value={limit}>{limit}</option>{/each}
        </select>
      </label>
    </div>
  </div>

  <div class="scenes">
    {#each book.stats as row (row.scene.id)}
      <button class="scene-row" data-scene={row.scene.id} onclick={() => (view = { view: "scene", id: row.scene.id })}>
        <span class="icon">{row.scene.icon}</span>
        <span class="body">
          <span class="title">{row.scene.title}</span>
          <span class="track"><i style="width:{percent(row.known, row.scene.phrases.length)}%"></i></span>
        </span>
        <span class="count">
          {row.known}/{row.scene.phrases.length}
          {#if row.due > 0}<em>{row.due} do powt.</em>{/if}
        </span>
      </button>
    {/each}
  </div>
{/if}
