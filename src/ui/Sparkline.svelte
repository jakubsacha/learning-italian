<!-- Słupki: wysokość względem najwyższego, szczegóły pod kursorem. -->
<script lang="ts">
  type Props = {
    bars: readonly { value: number; label: string }[];
    future?: boolean;
    name?: string;
  };
  let { bars, future = false, name = "" }: Props = $props();

  const max = $derived(Math.max(1, ...bars.map((b) => b.value)));
</script>

<div class="spark" data-test={name}>
  {#each bars as bar, i (i)}
    <i
      class={bar.value === 0 ? "none" : future ? "future" : ""}
      style="height:{Math.round((bar.value / max) * 100)}%"
      title={bar.label}
    ></i>
  {/each}
</div>
