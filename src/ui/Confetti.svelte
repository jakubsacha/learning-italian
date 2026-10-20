<!-- Konfetti na sukces, wspólne dla podstron. Każde nowe `burst` wysypuje świeżą porcję. -->
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

<style>
.confetti {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 50;
}

.confetti i {
  position: absolute;
  top: -20px;
  width: 10px;
  height: 16px;
  border-radius: 3px;
  animation: fall 1.8s ease-in forwards;
}

@keyframes fall {
  to {
    transform: translate(var(--drift), 110vh) rotate(calc(var(--spin) + 540deg));
    opacity: 0.8;
  }
}

@media (prefers-reduced-motion: reduce) {
  .confetti {
    display: none;
  }
}
</style>
