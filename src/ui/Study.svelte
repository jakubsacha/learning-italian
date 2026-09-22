<!--
  Zakładki Nauka / Fiszki / Trudne. Jedna sesja, pięć form pytania i ekran
  końcowy. Który widok jest na ekranie, wynika wprost z rodzaju ćwiczenia —
  nie ma już pięciu atrybutów `hidden`, które mogły sobie przeczyć.
-->
<script lang="ts">
  import type { Learning } from "../app/learning.svelte.js";
  import type { Choice, Grade } from "../domain/types.js";
  import type { TypedOutcome } from "../domain/text.js";
  import { LIMITS, type NewLimit } from "../storage/saved.js";
  import { assertNever } from "../domain/types.js";
  import SessionBar from "./SessionBar.svelte";
  import Flashcard from "./exercises/Flashcard.svelte";
  import ChoiceExercise from "./exercises/ChoiceExercise.svelte";
  import ListenExercise from "./exercises/ListenExercise.svelte";
  import ClozeExercise from "./exercises/ClozeExercise.svelte";
  import TypeExercise from "./exercises/TypeExercise.svelte";
  import { days, flashcards, whenLabel } from "./format.js";
  import { isLeech } from "../domain/scheduler.js";

  type Props = { app: Learning; now: Date; active: boolean };
  let { app, now, active }: Props = $props();

  const session = $derived(app.session);
  /** Odsłonięcie fiszki żyje tylko na ekranie i gaśnie razem z kartą. */
  let revealed = $state(false);

  // Każde nowe ćwiczenie zaczyna się zakryte, niezależnie od tego, co je wywołało:
  // ocena, zmiana zakładki czy zmiana limitu.
  $effect(() => {
    void (session.status === "active" ? session.current : null);
    revealed = false;
  });

  function reveal(): void {
    revealed = true;
  }

  function next(): void {
    revealed = false;
    app.next();
  }

  function grade(g: Grade): void {
    app.answer({ via: "self", grade: g });
    next();
  }

  /** Po odpowiedzi słychać poprawną formę — poza ćwiczeniem ze słuchu, gdzie już zabrzmiała. */
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

  /** Czy właśnie czekamy z werdyktem na ekranie. */
  const settled = $derived(session.status === "active" && session.phase.phase === "answered");

  function onkeydown(event: KeyboardEvent): void {
    if (!active || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    const inField = target instanceof HTMLElement && target.closest("input, select, textarea, summary") !== null;
    // W polu tekstowym cyfry i spacja to pisanie, nie sterowanie.
    if (inField && (event.code === "Space" || "1234".includes(event.key))) return;

    if (session.status === "done") {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        if (session.kind !== "hard") app.studyMore();
      }
      return;
    }
    const isCard = session.current.kind === "card";
    const isTyping = session.current.kind === "type";

    if (event.code === "Space" || event.code === "Enter") {
      if (inField) return;
      event.preventDefault();
      if (settled) next();
      else if (isCard && !revealed) reveal();
      else if (isCard && revealed) grade("good");
      return;
    }
    if ((event.key === "s" || event.key === "S") && !isTyping) {
      app.sayCurrent();
      return;
    }
    if (!"1234".includes(event.key)) return;
    if (isCard) {
      if (revealed) grade((["again", "hard", "good", "easy"] as const)[Number(event.key) - 1] ?? "good");
      return;
    }
    if (settled || isTyping) return;
    // Cyfra wybiera odpowiedź o tym numerze — tak samo jak kliknięcie.
    const button = document.querySelectorAll<HTMLButtonElement>(".opts .opt")[Number(event.key) - 1];
    button?.click();
  }
</script>

<svelte:window {onkeydown} />

<SessionBar summary={app.summary} kind={session.kind} />

{#if session.status === "active"}
  {@const current = session.current}
  {#if current.kind === "card"}
    <Flashcard
      word={current.word}
      review={current.review}
      leech={isLeech(app.progress.get(current.word.id))}
      {revealed}
      {now}
      ongrade={grade}
      onreveal={reveal}
      onsay={() => app.sayCurrent()}
    />
  {:else if current.kind === "choice"}
    <ChoiceExercise
      word={current.word}
      direction={current.direction}
      choices={current.choices}
      phase={session.phase}
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
      onanswer={typed}
      onnext={next}
    />
  {:else}
    {assertNever(current)}
  {/if}
{:else}
  <div class="done-box" data-view="done">
    <b
      >{session.reason === "no-leeches"
        ? "Nie ma trudnych słów"
        : session.reason === "hard-finished"
          ? "Trudne przerobione 🎉"
          : "Na dziś zrobione 🎉"}</b
    >
    <p class="meta">
      {#if session.reason === "no-leeches"}
        Tu trafiają słowa, na których pomylisz się co najmniej trzy razy. Na razie pusto.
      {:else if session.reason === "hard-finished"}
        Wróć tu jutro — albo po prostu ucz się dalej w zakładce Nauka.
      {:else}
        {#if session.nextDue !== null}Następne powtórki: {whenLabel(session.nextDue)}.{/if}
        {session.newInReserve > 0
          ? "Nowych słów w zapasie: " + session.newInReserve + "."
          : "Wszystkie słowa już wprowadzone."}
      {/if}
    </p>
    {#if session.kind !== "hard" && app.stats.hardest.length > 0}
      <div class="hard-list" data-test="leeches">
        Najczęściej się wykładasz na:
        {#each app.stats.hardest.slice(0, 6) as entry, i (entry.word.id)}{i > 0
            ? ", "
            : " "}<b>{entry.word.it}</b> ({entry.word.pl}){/each}
      </div>
    {/if}
    {#if session.kind !== "hard"}
      <button class="btn ghost" data-test="more" onclick={() => app.studyMore()}>Ucz się dalej poza planem</button>
    {/if}
  </div>
{/if}

<div class="sess-foot">
  <span data-test="stat">
    Dziś {flashcards(app.doneToday)} · nowe {app.newToday}/{app.limit} · seria
    {days(app.stats.streak)} · utrwalone {app.stats.byState.mature}/{app.deck.words.length}
  </span>
  <details class="settings">
    <summary>Ustawienia</summary>
    <div class="opts-in">
      <label>
        Nowe słowa dziennie
        <select
          value={app.limit}
          onchange={(e) => app.setLimit(Number(e.currentTarget.value) as NewLimit)}
        >
          {#each LIMITS as limit (limit)}
            <option value={limit}>{limit}</option>
          {/each}
        </select>
      </label>
      <label class="chk">
        <input
          type="checkbox"
          checked={app.voice}
          onchange={(e) => app.setVoice(e.currentTarget.checked)}
        /> Czytaj słowo na głos automatycznie
      </label>
      <button
        class="btn ghost"
        onclick={() => {
          if (confirm("Wyzerować cały postęp fiszek?")) app.reset();
        }}>Wyzeruj postęp fiszek</button
      >
    </div>
  </details>
</div>
