<!--
  Sesja rozmówek. Każde ćwiczenie montuje się od nowa (`#key`), więc klocki,
  wpisany tekst i odsłonięcie nie przechodzą na następną kartę — nawet gdy ta
  sama kwestia wraca od razu po „Nie wiem".
-->
<script lang="ts">
  import type { Phrasebook } from "../../app/phrasebook.svelte.js";
  import type { Choice, Grade } from "../../domain/types.js";
  import { assertNever } from "../../domain/types.js";
  import RevealCard from "./RevealCard.svelte";
  import OrderExercise from "./OrderExercise.svelte";
  import DictationExercise from "./DictationExercise.svelte";
  import ListenExercise from "./ListenExercise.svelte";
  import { cards, whenLabel } from "../format.js";

  type Props = { book: Phrasebook; now: Date; active: boolean; onback: () => void };
  let { book, now, active, onback }: Props = $props();

  const session = $derived(book.session);
  const summary = $derived(book.summary);
  let revealed = $state(false);

  $effect(() => {
    void (session.status === "active" ? session.current : null);
    revealed = false;
  });

  function reveal(): void {
    if (revealed || session.status !== "active") return;
    revealed = true;
    // Przy mówieniu odsłonięcie to sprawdzenie — słychać, jak powinno brzmieć.
    if (session.current.kind === "speak") book.sayCurrent();
  }

  function next(): void {
    revealed = false;
    book.next();
  }

  function grade(g: Grade): void {
    book.answer({ via: "self", grade: g });
    next();
  }

  function pick(choice: Choice): void {
    book.answer({ via: "choice", correct: choice.correct });
  }

  function order(placed: readonly string[]): void {
    if (session.status === "active") book.echo(session.current.phrase);
    book.answer({ via: "order", placed });
  }

  function dictation(text: string): void {
    book.answer({ via: "typed", text });
  }

  const settled = $derived(session.status === "active" && session.phase.phase === "answered");

  function onkeydown(event: KeyboardEvent): void {
    if (!active || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea")) return;
    if (session.status !== "active") return;
    const kind = session.current.kind;
    const selfGraded = kind === "read" || kind === "speak";
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      if (settled) next();
      else if (selfGraded && !revealed) reveal();
      else if (selfGraded && revealed) grade("good");
      return;
    }
    if (event.key === "s" || event.key === "S") {
      book.sayCurrent();
      return;
    }
    if (!"1234".includes(event.key)) return;
    if (selfGraded && revealed) {
      grade((["again", "hard", "good", "easy"] as const)[Number(event.key) - 1] ?? "good");
    } else if (kind === "listen" && !settled) {
      document.querySelectorAll<HTMLButtonElement>("[data-test='panel-phrases'] .opts .opt")[
        Number(event.key) - 1
      ]?.click();
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="sess">
  <div class="sess-top">
    <span class="sess-left" data-test="left">
      {summary.left > 0 ? "Rozmówki: " + cards(summary.left) : "Sesja skończona"}
    </span>
    <span class="sess-of" data-test="count">{summary.passed} / {summary.total}</span>
  </div>
  <div class="bar"><i style="width:{summary.percent}%"></i></div>
</div>

{#if session.status === "active"}
  {@const current = session.current}
  {#key current}
    {#if current.kind === "read" || current.kind === "speak"}
      <RevealCard
        mode={current.kind}
        phrase={current.phrase}
        review={book.progress.get(current.phrase.id) ?? null}
        {revealed}
        {now}
        onreveal={reveal}
        ongrade={grade}
        onsay={() => book.sayCurrent()}
      />
    {:else if current.kind === "listen"}
      <ListenExercise
        phrase={current.phrase}
        choices={current.choices}
        phase={session.phase}
        onplay={() => book.sayCurrent()}
        onpick={pick}
        onnext={next}
      />
    {:else if current.kind === "order"}
      <OrderExercise
        phrase={current.phrase}
        tiles={current.tiles}
        phase={session.phase}
        oncheck={order}
        onnext={next}
      />
    {:else if current.kind === "dictation"}
      <DictationExercise
        phrase={current.phrase}
        phase={session.phase}
        outcome={book.lastGraded?.typed ?? null}
        onplay={() => book.sayCurrent()}
        oncheck={dictation}
        onnext={next}
      />
    {:else}
      {assertNever(current)}
    {/if}
  {/key}
{:else}
  <div class="done-box" data-view="p-done">
    <b>{session.reason === "empty" ? "Na razie nic tu nie czeka" : "Rozmówki na dziś zrobione 🎉"}</b>
    <p class="meta">
      {session.nextDue === null ? "" : "Następne powtórki: " + whenLabel(session.nextDue) + ". "}
      {session.newInReserve > 0
        ? "Nowych kwestii w zapasie: " + session.newInReserve + "."
        : "Wszystkie kwestie już wprowadzone."}
    </p>
    {#if session.newInReserve > 0}
      <button class="btn ghost" data-test="more" onclick={() => book.studyMore()}>
        Jeszcze kilka nowych
      </button>
    {/if}
    <button class="btn ghost" data-test="back" onclick={onback}>Wróć do sytuacji</button>
  </div>
{/if}
