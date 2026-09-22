<!-- Słuchanie: zdanie tylko w uszach, znaczenie do wybrania z czterech. -->
<script lang="ts">
  import type { Choice, Phase } from "../../domain/types.js";
  import type { Phrase } from "../../domain/phrases/types.js";
  import Options from "../exercises/Options.svelte";
  import Verdict from "../exercises/Verdict.svelte";

  type Props = {
    phrase: Phrase;
    choices: readonly Choice[];
    phase: Phase;
    onplay: () => void;
    onpick: (choice: Choice) => void;
    onnext: () => void;
  };
  let { phrase, choices, phase, onplay, onpick, onnext }: Props = $props();
</script>

<div class="card ask" data-view="p-listen" data-phrase={phrase.it}>
  <div class="ask-lead">Posłuchaj i wybierz znaczenie</div>
  <button class="big-say" aria-label="Odtwórz" onclick={onplay}>🔊</button>
  <div class="ask-sub">kliknij, żeby powtórzyć<span class="kb-hint"> · klawisz S</span></div>
</div>

<Options {choices} answered={phase.phase === "answered"} {onpick} />

{#if phase.phase === "answered"}
  <Verdict
    correct={phase.correct}
    text={(phase.correct ? "Dobrze! " : "Poprawnie: ") + phrase.it + " — " + phrase.pl}
    {onnext}
  />
{/if}
