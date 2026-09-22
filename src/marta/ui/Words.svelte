<!-- Wszystkie słówka, pogrupowane, z zaznaczeniem tych już umianych. -->
<script lang="ts">
  import type { Marta } from "../app.svelte.js";

  type Props = { app: Marta };
  let { app }: Props = $props();

  const groups = $derived(
    app.deck.categories.map((category) => ({
      category,
      words: app.deck.words.filter((w) => w.category === category),
    })),
  );

  const MARK = { untouched: "", learning: "🌱", young: "🌿", mature: "⭐" } as const;
</script>

{#each groups as group (group.category)}
  <h3 class="st-h">{group.category}</h3>
  <div class="card scroll">
    <table>
      <thead><tr><th>Po angielsku</th><th>Po polsku</th></tr></thead>
      <tbody>
        {#each group.words as word (word.id)}
          <tr data-word={word.it}>
            <td class="it">{word.it}<small>czytaj: {word.pr}</small></td>
            <td>{word.pl} <span class="mark">{MARK[app.stateOfWord(word)]}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/each}

<p class="meta">⭐ umiesz na pamięć · 🌿 już prawie · 🌱 dopiero poznane</p>
