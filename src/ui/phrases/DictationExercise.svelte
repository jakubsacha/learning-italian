<!-- Dyktando: słyszysz zdanie, zapisujesz je. Tekstu nie widać, dopóki nie sprawdzisz. -->
<script lang="ts">
  import type { Phase } from "../../domain/types.js";
  import type { Phrase } from "../../domain/phrases/types.js";
  import type { TypedOutcome } from "../../domain/text.js";
  import Verdict from "../exercises/Verdict.svelte";

  type Props = {
    phrase: Phrase;
    phase: Phase;
    outcome: TypedOutcome | null;
    onplay: () => void;
    oncheck: (text: string) => void;
    onnext: () => void;
  };
  let { phrase, phase, outcome, onplay, oncheck, onnext }: Props = $props();

  let text = $state("");
  let field = $state<HTMLInputElement | null>(null);
  const answered = $derived(phase.phase === "answered");

  $effect(() => {
    void phrase;
    text = "";
    field?.focus();
  });

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    if (!answered && text.trim() !== "") oncheck(text);
  }
</script>

<div class="card ask" data-view="p-dictation" data-phrase={phrase.it}>
  <div class="ask-lead">Posłuchaj i zapisz po włosku</div>
  <button class="big-say" aria-label="Odtwórz" onclick={onplay}>🔊</button>
  <div class="ask-sub">kliknij, żeby posłuchać jeszcze raz</div>
</div>

<form class="type-row" autocomplete="off" onsubmit={submit}>
  <input
    bind:this={field}
    bind:value={text}
    data-test="type-input"
    class={answered ? (outcome === "wrong" ? "no" : "ok") : ""}
    type="text"
    autocapitalize="none"
    autocorrect="off"
    spellcheck="false"
    placeholder="zapisz, co słyszysz…"
    aria-label="Zdanie po włosku"
    disabled={answered}
  />
  {#if !answered}<button class="btn" data-test="check" type="submit">Sprawdź</button>{/if}
</form>

{#if phase.phase === "answered"}
  <Verdict
    correct={phase.correct}
    text={(outcome === "exact" ? "Bez błędu! " : outcome === "typo" ? "Prawie — poprawnie: " : "Poprawnie: ") +
      phrase.it +
      " — " +
      phrase.pl}
    {onnext}
  />
{/if}
