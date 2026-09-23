<script lang="ts">
  import type { SessionSummary } from "../domain/stats.js";
  import type { SessionKind } from "../domain/types.js";
  import { cards, newOnes, reviews, tough } from "./format.js";

  type Props = { summary: SessionSummary; kind: SessionKind };
  let { summary, kind }: Props = $props();

  const LEAD: Readonly<Record<SessionKind, string>> = {
    mix: "Zostało ",
    review: "Powtórki: ",
    new: "Nowe słowa: ",
    hard: "Trening trudnych: ",
  };

  const mix = $derived(
    [
      summary.again > 0 ? reviews(summary.again) : "",
      summary.tough > 0 ? tough(summary.tough) : "",
      summary.fresh > 0 ? newOnes(summary.fresh) : "",
    ]
      .filter((part) => part !== "")
      .join(" · "),
  );
</script>

<div class="sess">
  <div class="sess-top">
    <span class="sess-left" data-test="left">
      {#if summary.left > 0}
        {LEAD[kind]}{cards(summary.left)}
      {:else}
        Sesja skończona
      {/if}
    </span>
    <span class="sess-of" data-test="count">{summary.passed} / {summary.total}</span>
  </div>
  <div class="bar"><i style="width:{summary.percent}%"></i></div>
  <div class="sess-mix" data-test="mix">{summary.left > 0 ? mix : ""}</div>
</div>
