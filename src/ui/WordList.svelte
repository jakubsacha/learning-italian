<!-- Słownik: cała pula, przeszukiwana po włosku, polsku i wymowie. -->
<script lang="ts">
  import type { Learning } from "../app/learning.svelte.js";
  import { normalise, withCount } from "../domain/text.js";

  type Props = { app: Learning };
  let { app }: Props = $props();

  let query = $state("");

  const rows = $derived.by(() => {
    const needle = normalise(query);
    if (needle === "") return app.pool;
    return app.pool.filter(
      (w) =>
        normalise(w.it).includes(needle) ||
        normalise(w.pl).includes(needle) ||
        normalise(w.pr).includes(needle),
    );
  });
</script>

<input class="search" bind:value={query} placeholder="Szukaj po włosku lub polsku…" />
<div class="card scroll">
  <table>
    <thead><tr><th>Włoski / wymowa</th><th>Polski</th></tr></thead>
    <tbody>
      {#each rows as word (word.id)}
        <tr data-word={word.it}>
          <td class="it">{word.it}<small>[{word.pr}]</small></td>
          <td>{word.pl}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
<p class="meta" style="margin-top:8px">{withCount(rows.length, "słowo", "słowa", "słów")}</p>
