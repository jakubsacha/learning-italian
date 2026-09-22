<script lang="ts">
  import type { Phase, Word } from "../../domain/types.js";
  import { judgeTyped, type TypedOutcome } from "../../domain/text.js";
  import Verdict from "./Verdict.svelte";

  type Props = {
    word: Word;
    accepted: readonly string[];
    phase: Phase;
    onanswer: (outcome: TypedOutcome) => void;
    onnext: () => void;
  };
  let { word, accepted, phase, onanswer, onnext }: Props = $props();

  let guess = $state("");
  let outcome = $state<TypedOutcome | null>(null);
  let field = $state<HTMLInputElement | null>(null);

  const answered = $derived(phase.phase === "answered");

  // Nowe pytanie czyści pole i ustawia w nim kursor, żeby dało się pisać od razu.
  $effect(() => {
    if (answered) return;
    guess = "";
    outcome = null;
    field?.focus();
  });

  function check(event: SubmitEvent): void {
    event.preventDefault();
    if (answered || guess.trim() === "") return;
    const judged = judgeTyped(guess, accepted);
    outcome = judged;
    onanswer(judged);
  }
</script>

<div class="card ask" data-view="type" data-word={word.it}>
  <div class="ask-lead">Napisz po włosku</div>
  <div class="ask-main">{word.pl}</div>
  <div class="ask-sub">{word.it.includes("/") ? "wystarczy jedna z form" : ""}</div>
</div>

<form class="type-row" autocomplete="off" onsubmit={check}>
  <input
    bind:this={field}
    bind:value={guess}
    class={answered ? (outcome === "wrong" ? "no" : "ok") : ""}
    data-test="type-input"
    type="text"
    inputmode="text"
    autocapitalize="none"
    autocorrect="off"
    spellcheck="false"
    placeholder="wpisz po włosku…"
    aria-label="Odpowiedź po włosku"
    disabled={answered}
  />
  {#if !answered}
    <button class="btn" data-test="check" type="submit">Sprawdź</button>
  {/if}
</form>

{#if phase.phase === "answered"}
  <Verdict
    correct={phase.correct}
    text={outcome === "exact"
      ? "Dobrze! " + word.it
      : outcome === "typo"
        ? "Prawie — poprawnie: " + word.it
        : "Poprawnie: " + word.it + " [" + word.pr + "]"}
    {onnext}
  />
{/if}
