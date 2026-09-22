<!-- Postęp: co już umiesz, co Cię czeka i gdzie się wykładasz. -->
<script lang="ts">
  import type { Learning } from "../app/learning.svelte.js";
  import Sparkline from "./Sparkline.svelte";
  import { dayLabel, flashcards, days, percent } from "./format.js";

  type Props = { app: Learning };
  let { app }: Props = $props();

  const stats = $derived(app.stats);
  /** Podział liczymy wśród poznanych — inaczej cały pasek byłby szary. */
  const base = $derived(Math.max(1, stats.seen));

  const SEGMENTS = [
    { name: "utrwalone", key: "mature", color: "var(--st-3)" },
    { name: "młode", key: "young", color: "var(--st-2)" },
    { name: "w nauce", key: "learning", color: "var(--st-1)" },
  ] as const;
</script>

<div class="tiles">
  <div class="tile-stat"><b data-test="mature">{stats.byState.mature}</b><span>utrwalone</span></div>
  <div class="tile-stat"><b data-test="seen">{stats.seen}</b><span>poznane</span></div>
  <div class="tile-stat"><b data-test="streak">{stats.streak}</b><span>dni z rzędu</span></div>
</div>

<h3 class="st-h">Ile kursu za Tobą</h3>
<p class="cover-txt" data-test="cover">
  {stats.seen} / {stats.total}
  <span>({Math.round(percent(stats.seen, stats.total))}% słownictwa)</span>
</p>
<div class="bar"><i style="width:{percent(stats.seen, stats.total)}%"></i></div>

<h3 class="st-h">Jak dzielą się poznane słowa</h3>
<div class="segbar" data-test="segments">
  {#if stats.seen === 0}
    <i style="width:100%;background:var(--st-0)" title="nic jeszcze nie poznane"></i>
  {/if}
  {#each SEGMENTS as segment (segment.key)}
    {#if stats.byState[segment.key] > 0}
      <i
        style="width:{percent(stats.byState[segment.key], base)}%;background:{segment.color}"
        title="{segment.name}: {stats.byState[segment.key]}"
      ></i>
    {/if}
  {/each}
</div>
<div class="legend" data-test="legend">
  {#each SEGMENTS as segment (segment.key)}
    <span><s style="background:{segment.color}"></s><b>{stats.byState[segment.key]}</b>
      {segment.name}</span>
  {/each}
</div>

<h3 class="st-h">Aktywność — ostatnie 30 dni</h3>
<Sparkline
  name="activity"
  bars={stats.activity.map((d) => ({ value: d.count, label: d.key + ": " + flashcards(d.count) }))}
/>
<p class="meta">
  Razem {flashcards(stats.activityTotal)} w {days(stats.activeDays)} · najlepszy dzień {stats.bestDay}
</p>

<h3 class="st-h">Co Cię czeka — najbliższe 14 dni</h3>
<Sparkline
  future
  name="forecast"
  bars={stats.forecast.map((d) => ({ value: d.count, label: dayLabel(d.offset) + ": " + d.count }))}
/>
<p class="meta">
  Dziś {stats.forecast[0]?.count ?? 0} · w ciągu tygodnia {stats.dueThisWeek} · nowych w zapasie
  {stats.byState.untouched}
</p>

<h3 class="st-h">Kategorie z największym postępem</h3>
{#if stats.categories.length === 0}
  <p class="meta" data-test="no-cats">Zacznij naukę, a tu pojawi się podział na kategorie.</p>
{:else}
  {#each stats.categories as row (row.category)}
    <div class="catbar">
      <div class="top">
        <span class="nm">{row.category}</span>
        <span class="vl">{row.done} / {row.total}</span>
      </div>
      <span class="tr">
        <i
          style="width:{percent(row.done, row.total)}%"
          title="{row.category}: {row.done} z {row.total}"
        ></i>
      </span>
    </div>
  {/each}
{/if}

<h3 class="st-h">Najtrudniejsze słowa</h3>
{#if stats.hardest.length === 0}
  <p class="meta" data-test="no-hard">Jeszcze nie ma słów z trzema wpadkami. Dobrze.</p>
{:else}
  <table data-test="hardest">
    <thead><tr><th>Słowo</th><th>Znaczenie</th><th class="num-col">Wpadki</th></tr></thead>
    <tbody>
      {#each stats.hardest as entry (entry.word.id)}
        <tr>
          <td class="it">{entry.word.it}</td>
          <td>{entry.word.pl}</td>
          <td class="num-col">{entry.lapses}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
