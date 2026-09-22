<!--
  Fiszka Marty. Trzy oceny zamiast czterech: dla dziecka „Nie wiem / Prawie /
  Umiem" jest do rozstrzygnięcia, a cztery stopnie już nie.
-->
<script lang="ts">
  import type { Grade, Word } from "../../domain/types.js";

  type Props = {
    word: Word;
    revealed: boolean;
    ongrade: (grade: Grade) => void;
    onreveal: () => void;
    onsay: () => void;
  };
  let { word, revealed, ongrade, onreveal, onsay }: Props = $props();

  const GRADES: readonly { grade: Grade; label: string; emoji: string; cls: string }[] = [
    { grade: "again", label: "Nie wiem", emoji: "🤔", cls: "again" },
    { grade: "hard", label: "Prawie", emoji: "🙂", cls: "hard" },
    { grade: "good", label: "Umiem!", emoji: "🎉", cls: "good" },
  ];
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="card flash kid" data-view="card" data-word={word.it} onclick={onreveal}>
  <button
    class="say"
    title="Przeczytaj na głos"
    aria-label="Przeczytaj na głos"
    onclick={(e) => {
      e.stopPropagation();
      onsay();
    }}>🔊</button
  >
  <div class="cat">{word.category}</div>
  <div class="word">{word.it}</div>
  <div class="pron">czytaj: {word.pr}</div>
  {#if revealed}
    <div class="trans">{word.pl}</div>
  {/if}
</div>

{#if revealed}
  <div class="row grades kid-grades">
    {#each GRADES as g (g.grade)}
      <button class="btn {g.cls}" data-grade={g.grade} onclick={() => ongrade(g.grade)}>
        <span>{g.emoji} {g.label}</span>
      </button>
    {/each}
  </div>
{:else}
  <button class="btn reveal" data-test="reveal" onclick={onreveal}>Pokaż tłumaczenie</button>
{/if}
