<!-- Sesja Marty: fiszka, wybór, słuchanie, luka i wpisywanie krótkich słówek. -->
<script lang="ts">
  import type { Marta } from "../app.svelte.js";
  import type { Choice, Grade } from "../../domain/types.js";
  import { assertNever } from "../../domain/types.js";
  import type { TypedOutcome } from "../../domain/text.js";
  import Card from "./Card.svelte";
  import ChoiceExercise from "../../ui/exercises/ChoiceExercise.svelte";
  import ListenExercise from "../../ui/exercises/ListenExercise.svelte";
  import ClozeExercise from "../../ui/exercises/ClozeExercise.svelte";
  import TypeExercise from "../../ui/exercises/TypeExercise.svelte";
  import { withCount } from "../../domain/text.js";

  type Props = { app: Marta };
  let { app }: Props = $props();

  const session = $derived(app.session);
  let revealed = $state(false);

  $effect(() => {
    void (session.status === "active" ? session.current : null);
    revealed = false;
  });

  function next(): void {
    revealed = false;
    app.next();
  }

  function grade(g: Grade): void {
    app.answer({ via: "self", grade: g });
    next();
  }

  /** Po odpowiedzi słychać poprawną formę — poza słuchaniem, gdzie już zabrzmiała. */
  function echo(): void {
    if (session.status !== "active") return;
    const current = session.current;
    if (current.kind === "listen") return;
    app.sayIfOn(current.kind === "cloze" ? current.sentence.it : current.word.it);
  }

  function pick(choice: Choice): void {
    echo();
    app.answer({ via: "choice", correct: choice.correct });
  }

  function typed(outcome: TypedOutcome): void {
    echo();
    app.answer({ via: "typed", outcome });
  }

  const summary = $derived(app.summary);
  /** Gwiazdki zamiast procentów — widać od razu, ile jeszcze zostało. */
  const stars = $derived(
    Array.from({ length: summary.total }, (_, i) => i < summary.passed),
  );
</script>

<div class="sess">
  <div class="stars" data-test="stars">
    {#each stars as done, i (i)}
      <span class:done>{done ? "⭐" : "☆"}</span>
    {/each}
  </div>
  <div class="sess-top">
    <span class="sess-left" data-test="left">
      {summary.left > 0 ? "Zostało " + withCount(summary.left, "karta", "karty", "kart") : "Brawo!"}
    </span>
    <span class="sess-of" data-test="count">{summary.passed} / {summary.total}</span>
  </div>
  <div class="bar"><i style="width:{summary.percent}%"></i></div>
</div>

{#if session.status === "active"}
  {@const current = session.current}
  {#if current.kind === "card"}
    <Card
      word={current.word}
      {revealed}
      ongrade={grade}
      onreveal={() => (revealed = true)}
      onsay={() => app.sayCurrent()}
    />
  {:else if current.kind === "choice"}
    <ChoiceExercise
      word={current.word}
      direction={current.direction}
      choices={current.choices}
      phase={session.phase}
      foreign="angielsku"
      onpick={pick}
      onnext={next}
    />
  {:else if current.kind === "listen"}
    <ListenExercise
      word={current.word}
      choices={current.choices}
      phase={session.phase}
      onpick={pick}
      onnext={next}
      onplay={() => app.sayCurrent()}
    />
  {:else if current.kind === "cloze"}
    <ClozeExercise
      sentence={current.sentence}
      split={current.split}
      choices={current.choices}
      phase={session.phase}
      onpick={pick}
      onnext={next}
    />
  {:else if current.kind === "type"}
    <TypeExercise
      word={current.word}
      accepted={current.accepted}
      phase={session.phase}
      foreign="angielsku"
      onanswer={typed}
      onnext={next}
    />
  {:else}
    {assertNever(current)}
  {/if}
{:else}
  <div class="done-box kid-done" data-view="done">
    <b>Super! Na dziś koniec 🎉</b>
    <p class="meta">
      Dziś zrobione: {withCount(app.doneToday, "karta", "karty", "kart")}.
      {#if app.streak > 1}Uczysz się {withCount(app.streak, "dzień", "dni", "dni")} z rzędu!{/if}
    </p>
    <button class="btn ghost" data-test="more" onclick={() => app.studyMore()}>
      Chcę jeszcze poćwiczyć
    </button>
  </div>
{/if}
