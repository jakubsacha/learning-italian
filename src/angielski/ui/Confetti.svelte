<!-- Konfetti na sukces. Każde nowe `burst` wysypuje świeżą porcję. -->
<script lang="ts">
  type Props = { burst: number };
  let { burst }: Props = $props();

  const COLORS = ["#ff7043", "#ffca28", "#66bb6a", "#29b6f6", "#ab47bc", "#ec407a"];
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: (i % 9) * 0.05,
    color: COLORS[i % COLORS.length],
    spin: (i * 53) % 360,
    drift: ((i * 29) % 40) - 20,
  }));
</script>

{#if burst > 0}
  {#key burst}
    <div class="confetti" aria-hidden="true" data-test="confetti">
      {#each pieces as p, i (i)}
        <i
          style="left:{p.left}%;background:{p.color};animation-delay:{p.delay}s;--spin:{p.spin}deg;--drift:{p.drift}vw"
        ></i>
      {/each}
    </div>
  {/key}
{/if}
