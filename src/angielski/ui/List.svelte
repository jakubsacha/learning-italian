<!-- Wszystkie słówka z wybranych działów jako kafelki. Dotknięcie czyta na głos. -->
<script lang="ts">
  import type { English } from "../app.svelte.js";
  import { SECTIONS } from "../words.js";
  import Picture from "./Picture.svelte";

  type Props = { app: English };
  let { app }: Props = $props();
</script>

{#each SECTIONS.filter((s) => app.sections.has(s.id)) as s (s.id)}
  <h3 class="list-head">{s.icon} {s.lesson} {s.label}</h3>
  <div class="tiles-grid" class:wide={s.id === "pytania"}>
    {#each app.cards.filter((c) => c.section === s.id) as c (c.en)}
      <button class="word-tile" class:known={app.known.has(c.en)} onclick={() => app.say(c.en)} data-word={c.en}>
        <Picture art={c.art} size="small" />
        <b>{c.en}</b>
        <span>{c.pl}</span>
      </button>
    {/each}
  </div>
{/each}
