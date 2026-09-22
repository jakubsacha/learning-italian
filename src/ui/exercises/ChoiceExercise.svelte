<script lang="ts">
  import type { Choice, Phase, Word } from "../../domain/types.js";
  import Options from "./Options.svelte";
  import Verdict from "./Verdict.svelte";

  type Props = {
    word: Word;
    direction: "it-pl" | "pl-it";
    choices: readonly Choice[];
    phase: Phase;
    onpick: (choice: Choice) => void;
    onnext: () => void;
  };
  let { word, direction, choices, phase, onpick, onnext }: Props = $props();

  const askItalian = $derived(direction === "pl-it");
</script>

<div class="card ask" data-view="choice" data-word={word.it}>
  <div class="ask-lead">{askItalian ? "Jak to powiedzieć po włosku" : "Co to znaczy"}</div>
  <div class="ask-main">{askItalian ? word.pl : word.it}</div>
  <div class="ask-sub">{askItalian ? "" : "[" + word.pr + "]"}</div>
</div>

<Options {choices} answered={phase.phase === "answered"} {onpick} />

{#if phase.phase === "answered"}
  <Verdict
    correct={phase.correct}
    text={phase.correct ? "Dobrze!" : "Poprawnie: " + (askItalian ? word.it : word.pl)}
    {onnext}
  />
{/if}
