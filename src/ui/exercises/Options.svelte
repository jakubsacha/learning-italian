<!--
  Lista odpowiedzi do wyboru, wspólna dla quizu, słuchania i zdań z luką.
  Po odpowiedzi podświetla poprawną i blokuje resztę — stan trzyma faza sesji,
  nie atrybuty `disabled` rozsiane po pięciu miejscach jak wcześniej.
-->
<script lang="ts">
  import type { Choice } from "../../domain/types.js";

  type Props = {
    choices: readonly Choice[];
    answered: boolean;
    onpick: (choice: Choice) => void;
  };
  let { choices, answered, onpick }: Props = $props();

  let chosen = $state<string | null>(null);

  // Nowe pytanie kasuje zaznaczenie — inaczej podświetlenie przechodziłoby dalej.
  $effect(() => {
    if (!answered) chosen = null;
  });

  function pick(choice: Choice): void {
    if (answered) return;
    chosen = choice.text;
    onpick(choice);
  }
</script>

<div class="opts">
  {#each choices as choice, i (choice.text)}
    <button
      class="opt"
      class:ok={answered && choice.correct}
      class:no={answered && chosen === choice.text && !choice.correct}
      data-ok={choice.correct ? "1" : "0"}
      disabled={answered}
      onclick={() => pick(choice)}
    >
      <span class="kbd">{i + 1}</span>{choice.text}
    </button>
  {/each}
</div>
