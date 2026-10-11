<!-- Sesja: fiszki i test ABCD na przemian, powtórki przed nowymi. -->
<script lang="ts">
  import type { History } from "../app.svelte.js";
  import type { Choice, Grade } from "../../domain/types.js";
  import FactCard from "./FactCard.svelte";
  import Options from "../../ui/exercises/Options.svelte";
  import Verdict from "../../ui/exercises/Verdict.svelte";
  import { withCount } from "../../domain/text.js";
  import { whenLabel } from "../../ui/format.js";

  type Props = { app: History; active: boolean };
  let { app, active }: Props = $props();

  const session = $derived(app.session);
  const summary = $derived(app.summary);
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

  const pick = (choice: Choice): void => app.answer({ via: "choice", correct: choice.correct });
  const settled = $derived(session.status === "active" && session.phase.phase === "answered");
  const facts = (n: number): string => withCount(n, "fakt", "fakty", "faktów");

  function onkeydown(event: KeyboardEvent): void {
    if (!active || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea")) return;
    if (session.status === "done") return;
    const isCard = session.current.kind === "card";
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      if (settled) next();
      else if (isCard && !revealed) revealed = true;
      else if (isCard) grade("good");
      return;
    }
    if (!"1234".includes(event.key)) return;
    if (isCard && revealed && event.key !== "4") {
      grade((["again", "hard", "good"] as const)[Number(event.key) - 1] ?? "good");
    } else if (!isCard && !settled) {
      document.querySelectorAll<HTMLButtonElement>(".opts .opt")[Number(event.key) - 1]?.click();
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="sess">
  <div class="sess-top">
    <span class="sess-left" data-test="left">
      {summary.left > 0 ? "Zostało: " + facts(summary.left) : "Sesja skończona"}
    </span>
    <span class="sess-of" data-test="count">{summary.passed} / {summary.total}</span>
  </div>
  <div class="bar"><i style="width:{summary.percent}%"></i></div>
</div>

{#if session.status === "active"}
  {@const current = session.current}
  {#key current}
    {#if current.kind === "card"}
      <FactCard fact={current.fact} {revealed} onreveal={() => (revealed = true)} ongrade={grade} />
    {:else}
      <div class="card ask" data-view="choice" data-fact={current.fact.q}>
        <div class="ask-lead">{current.fact.key ? "★ " : ""}{current.fact.section}</div>
        <div class="fact-q">{current.fact.q}</div>
      </div>
      <Options choices={current.choices} answered={session.phase.phase === "answered"} onpick={pick} />
      {#if session.phase.phase === "answered"}
        <Verdict
          correct={session.phase.correct}
          text={(session.phase.correct ? "Dobrze! " : "Poprawnie: ") + current.fact.a}
          onnext={next}
        />
      {/if}
    {/if}
  {/key}
{:else}
  <div class="done-box" data-view="done">
    <b>{session.reason === "empty" ? "Na dziś nic nie czeka" : "Na dziś zrobione 🎉"}</b>
    <p class="meta">
      {session.nextDue === null ? "" : "Następne powtórki: " + whenLabel(session.nextDue) + ". "}
      {session.newInReserve > 0
        ? "Nowych faktów w zapasie: " + session.newInReserve + "."
        : "Cały materiał z tego zakresu już przerobiony."}
    </p>
    {#if session.newInReserve > 0}
      <button class="btn ghost" data-test="more" onclick={() => app.studyMore()}>
        Ucz się dalej — kolejne fakty
      </button>
    {/if}
  </div>
{/if}
