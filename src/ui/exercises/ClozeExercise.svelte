<script lang="ts">
  import type { Choice, GapSplit, Phase, Sentence } from "../../domain/types.js";
  import Options from "./Options.svelte";
  import Verdict from "./Verdict.svelte";

  type Props = {
    sentence: Sentence;
    split: GapSplit;
    choices: readonly Choice[];
    phase: Phase;
    onpick: (choice: Choice) => void;
    onnext: () => void;
  };
  let { sentence, split, choices, phase, onpick, onnext }: Props = $props();
</script>

<div class="card ask" data-view="cloze" data-word={sentence.gap}>
  <div class="ask-lead">Uzupełnij zdanie</div>
  <div class="ask-main">
    {split.before}<b>{phase.phase === "answered" ? sentence.gap : "  "}</b>{split.after}
  </div>
  <div class="ask-sub">{sentence.pl}</div>
</div>

<Options {choices} answered={phase.phase === "answered"} {onpick} />

{#if phase.phase === "answered"}
  <Verdict
    correct={phase.correct}
    text={phase.correct ? "Dobrze!" : "Poprawnie: " + sentence.it}
    {onnext}
  />
{/if}
