<!--
  Scenka jako dialog. Swoje kwestie widzisz po polsku — spróbuj powiedzieć je
  sam, a dopiero potem odsłoń włoskie. Kwestie rozmówcy widzisz po włosku,
  jak w prawdziwej rozmowie, a znaczenie odsłaniasz, gdy trzeba.
-->
<script lang="ts">
  import type { Phrasebook } from "../../app/phrasebook.svelte.js";
  import type { PhraseId, Scene } from "../../domain/phrases/types.js";

  type Props = { book: Phrasebook; scene: Scene; onback: () => void; onlearn: () => void };
  let { book, scene, onback, onlearn }: Props = $props();

  let shown = $state<ReadonlySet<PhraseId>>(new Set());

  function toggle(id: PhraseId): void {
    const next = new Set(shown);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    shown = next;
  }

  const MARK = { untouched: "", learning: "🌱", young: "🌿", mature: "⭐" } as const;
  const stats = $derived(book.stats.find((s) => s.scene.id === scene.id));
</script>

<div class="scene-head" data-view="p-scene" data-scene={scene.id}>
  <button class="btn ghost" data-test="back" onclick={onback}>← Sytuacje</button>
  <h2>{scene.icon} {scene.title}</h2>
  <p class="meta">
    {stats?.known ?? 0} z {scene.phrases.length} kwestii poznanych. Twoje kwestie są po polsku —
    powiedz je na głos, zanim odsłonisz.
  </p>
  <button class="btn good" data-test="learn" onclick={onlearn}>Ucz się tej sytuacji</button>
</div>

<div class="dialog">
  {#each scene.phrases as phrase (phrase.id)}
    {@const open = shown.has(phrase.id)}
    <div class="line {phrase.who}" data-phrase={phrase.it}>
      <button
        class="bubble"
        aria-expanded={open}
        onclick={() => {
          // Stan sprzed kliknięcia: po `toggle` wartość `open` już się przelicza.
          const opening = !shown.has(phrase.id);
          toggle(phrase.id);
          if (opening) book.say(phrase.it);
        }}
      >
        {#if phrase.who === "ty"}
          <span class="main">{phrase.pl}</span>
          {#if open}<span class="sub it">{phrase.it}</span>{/if}
        {:else}
          <span class="main it">{phrase.it}</span>
          {#if open}<span class="sub">{phrase.pl}</span>{/if}
        {/if}
        <span class="mark">{MARK[book.stateOf(phrase)]}</span>
      </button>
      <button class="say small" aria-label="Posłuchaj" onclick={() => book.say(phrase.it)}>🔊</button>
    </div>
  {/each}
</div>
