<script lang="ts">
  import type { Grade, Review, Word } from "../../domain/types.js";
  import { previewInterval } from "../../domain/scheduler.js";
  import { intervalLabel } from "../format.js";

  type Props = {
    word: Word;
    review: Review | null;
    leech: boolean;
    /** Odsłonięcie to stan ekranu, nie stan powtórki: karta idzie dalej dopiero po ocenie. */
    revealed: boolean;
    now: Date;
    ongrade: (grade: Grade) => void;
    onreveal: () => void;
    onsay: () => void;
  };
  let { word, review, leech, revealed, now, ongrade, onreveal, onsay }: Props = $props();

  const schedule = $derived(
    review === null
      ? "nowe słowo"
      : review.interval > 0
        ? "powtórka · poprzedni odstęp " + intervalLabel(review.interval)
        : "uczysz się jej dzisiaj",
  );

  const GRADES: readonly { grade: Grade; key: string; label: string; cls: string }[] = [
    { grade: "again", key: "1", label: "Nie wiem", cls: "again" },
    { grade: "hard", key: "2", label: "Słabo", cls: "hard" },
    { grade: "good", key: "3", label: "Dobrze", cls: "good" },
    { grade: "easy", key: "4", label: "Łatwo", cls: "easy" },
  ];

  const preview = (grade: Grade): string =>
    grade === "again" ? "za chwilę" : intervalLabel(previewInterval(review, grade, now));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="card flash" data-view="card" data-word={word.it} onclick={onreveal}>
  <button
    class="say"
    title="Przeczytaj na głos (S)"
    aria-label="Przeczytaj na głos"
    onclick={(e) => {
      e.stopPropagation();
      onsay();
    }}>🔊</button
  >
  <div class="cat">{word.category}</div>
  {#if leech}
    <div class="leech">słowo, które sprawia kłopot</div>
  {/if}
  <div class="word">{word.it}</div>
  <div class="pron">[{word.pr}]</div>
  {#if revealed}
    <div class="trans">{word.pl}</div>
  {/if}
  <div class="sched">{schedule}</div>
</div>

{#if revealed}
  <div class="row grades">
    {#each GRADES as g (g.grade)}
      <button class="btn {g.cls}" data-grade={g.grade} onclick={() => ongrade(g.grade)}>
        <span><i>{g.key}</i> {g.label}</span><small>{preview(g.grade)}</small>
      </button>
    {/each}
  </div>
{:else}
  <button class="btn reveal" data-test="reveal" onclick={onreveal}>Pokaż tłumaczenie <small>spacja</small></button>
{/if}
