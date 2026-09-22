<!--
  Karta z odsłanianiem i samooceną, w dwóch kierunkach:
  - `read`: widzisz i słyszysz włoskie, odsłaniasz znaczenie;
  - `speak`: widzisz polskie, mówisz na głos, odsłaniasz włoskie i je słyszysz.
-->
<script lang="ts">
  import type { Grade, Review } from "../../domain/types.js";
  import type { Phrase } from "../../domain/phrases/types.js";
  import { previewInterval } from "../../domain/scheduler.js";
  import { intervalLabel } from "../format.js";

  type Props = {
    mode: "read" | "speak";
    phrase: Phrase;
    review: Review | null;
    revealed: boolean;
    now: Date;
    onreveal: () => void;
    ongrade: (grade: Grade) => void;
    onsay: () => void;
  };
  let { mode, phrase, review, revealed, now, onreveal, ongrade, onsay }: Props = $props();

  const GRADES: readonly { grade: Grade; key: string; label: string }[] = [
    { grade: "again", key: "1", label: "Nie wiem" },
    { grade: "hard", key: "2", label: "Słabo" },
    { grade: "good", key: "3", label: "Dobrze" },
    { grade: "easy", key: "4", label: "Łatwo" },
  ];

  const preview = (grade: Grade): string =>
    grade === "again" ? "za chwilę" : intervalLabel(previewInterval(review, grade, now));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="card flash phrase-card" data-view={"p-" + mode} data-phrase={phrase.it} onclick={onreveal}>
  <button
    class="say"
    title="Przeczytaj na głos (S)"
    aria-label="Przeczytaj na głos"
    onclick={(e) => {
      e.stopPropagation();
      onsay();
    }}>🔊</button
  >
  <div class="cat">{mode === "read" ? "Co to znaczy?" : "Powiedz na głos po włosku"}</div>
  {#if mode === "read"}
    <div class="phrase-main">{phrase.it}</div>
    {#if revealed}<div class="trans">{phrase.pl}</div>{/if}
  {:else}
    <div class="phrase-main">{phrase.pl}</div>
    {#if revealed}<div class="trans it">{phrase.it}</div>{/if}
  {/if}
  <div class="sched">{phrase.who === "ty" ? "Twoja kwestia" : "mówi rozmówca"}</div>
</div>

{#if revealed}
  <div class="row grades">
    {#each GRADES as g (g.grade)}
      <button class="btn {g.grade}" data-grade={g.grade} onclick={() => ongrade(g.grade)}>
        <span><i>{g.key}</i> {g.label}</span><small>{preview(g.grade)}</small>
      </button>
    {/each}
  </div>
{:else}
  <button class="btn reveal" data-test="reveal" onclick={onreveal}>
    {mode === "read" ? "Pokaż tłumaczenie" : "Sprawdź"} <small>spacja</small>
  </button>
{/if}
