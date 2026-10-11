<!-- Fiszka: pytanie, odsłonięcie odpowiedzi, trzy oceny. -->
<script lang="ts">
  import type { Grade } from "../../domain/types.js";
  import type { Fact } from "../../domain/facts/types.js";

  type Props = {
    fact: Fact;
    revealed: boolean;
    onreveal: () => void;
    ongrade: (grade: Grade) => void;
  };
  let { fact, revealed, onreveal, ongrade }: Props = $props();

  const GRADES: readonly { grade: Grade; key: string; label: string; cls: string }[] = [
    { grade: "again", key: "1", label: "Nie wiem", cls: "again" },
    { grade: "hard", key: "2", label: "Prawie", cls: "hard" },
    { grade: "good", key: "3", label: "Umiem", cls: "good" },
  ];
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="card flash fact-card" data-view="card" data-fact={fact.q} onclick={onreveal}>
  <div class="cat">{fact.key ? "★ " : ""}{fact.section}</div>
  <div class="fact-q">{fact.q}</div>
  {#if revealed}
    <div class="trans">{fact.a}</div>
    {#if fact.page !== null}<div class="sched">podręcznik, s. {fact.page}</div>{/if}
  {/if}
</div>

{#if revealed}
  <div class="row grades three">
    {#each GRADES as g (g.grade)}
      <button class="btn {g.cls}" data-grade={g.grade} onclick={() => ongrade(g.grade)}>
        <span><i>{g.key}</i> {g.label}</span>
      </button>
    {/each}
  </div>
{:else}
  <button class="btn reveal" data-test="reveal" onclick={onreveal}>
    Pokaż odpowiedź <small>spacja</small>
  </button>
{/if}
