<!-- Ściąga: cały materiał do przeczytania, pogrupowany tak jak w książce. -->
<script lang="ts">
  import type { History } from "../app.svelte.js";
  import type { Fact } from "../../domain/facts/types.js";
  import { LESSONS } from "../facts.js";

  type Props = { app: History };
  let { app }: Props = $props();

  let onlyKey = $state(false);

  const groups = $derived.by(() => {
    const shown = app.facts.filter((f) => !onlyKey || f.key);
    const out: { title: string; sections: { name: string; facts: Fact[] }[] }[] = [];
    for (const f of shown) {
      const title = f.lesson + ". " + LESSONS[f.lesson];
      let lesson = out.find((l) => l.title === title);
      if (lesson === undefined) {
        lesson = { title, sections: [] };
        out.push(lesson);
      }
      let section = lesson.sections.find((s) => s.name === f.section);
      if (section === undefined) {
        section = { name: f.section, facts: [] };
        lesson.sections.push(section);
      }
      section.facts.push(f);
    }
    return out;
  });

  const MARK = { untouched: "", learning: "🌱", young: "🌿", mature: "✅" } as const;
</script>

<label class="chk">
  <input type="checkbox" bind:checked={onlyKey} /> Tylko najważniejsze (★ — pogrubione w książce)
</label>

{#each groups as lesson (lesson.title)}
  <h2 class="notes-lesson">{lesson.title}</h2>
  {#each lesson.sections as section (section.name)}
    <h3 class="st-h">{section.name}</h3>
    <dl class="notes">
      {#each section.facts as f (f.id)}
        <div class="note" class:key={f.key} data-fact={f.q}>
          <dt>{f.key ? "★ " : ""}{f.q} <span class="mark">{MARK[app.stateOf(f)]}</span></dt>
          <dd>{f.a}</dd>
        </div>
      {/each}
    </dl>
  {/each}
{/each}

<p class="meta">🌱 dopiero poznane · 🌿 już prawie · ✅ umiesz na pamięć</p>
