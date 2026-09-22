<script lang="ts">
  import type { Choice, Phase, Word } from "../../domain/types.js";
  import Options from "./Options.svelte";
  import Verdict from "./Verdict.svelte";

  type Props = {
    word: Word;
    choices: readonly Choice[];
    phase: Phase;
    onpick: (choice: Choice) => void;
    onnext: () => void;
    onplay: () => void;
  };
  let { word, choices, phase, onpick, onnext, onplay }: Props = $props();
</script>

<div class="card ask" data-view="listen" data-word={word.it}>
  <div class="ask-lead">Posłuchaj i wybierz znaczenie</div>
  <button class="big-say" aria-label="Odtwórz" onclick={onplay}>🔊</button>
  <div class="ask-sub">kliknij, żeby powtórzyć<span class="kb-hint"> · klawisz S</span></div>
</div>

<Options {choices} answered={phase.phase === "answered"} {onpick} />

{#if phase.phase === "answered"}
  <Verdict
    correct={phase.correct}
    text={phase.correct ? "Dobrze!" : "Poprawnie: " + word.it + " [" + word.pr + "] — " + word.pl}
    {onnext}
  />
{/if}
