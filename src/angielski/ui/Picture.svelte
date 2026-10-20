<!-- Obrazek słówka: nasz rysunek albo emoji. -->
<script lang="ts">
  import { ART } from "../art.js";
  import type { Art } from "../words.js";

  type Props = { art: Art; size?: "big" | "small" };
  let { art, size = "big" }: Props = $props();
</script>

{#if "draw" in art}
  <svg class="pic {size}" viewBox="0 0 100 100" aria-hidden="true">{@html ART[art.draw] ?? ""}</svg>
{:else}
  <span class="pic emoji {size}" aria-hidden="true">{art.emoji}</span>
{/if}
