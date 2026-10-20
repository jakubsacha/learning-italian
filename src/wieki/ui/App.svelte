<!--
  „Który to wiek?": losowy rok, cztery wieki do wyboru, po odpowiedzi
  wyjaśnienie i linijka z trzema wiekami. Dziesięć pytań w rundzie.
-->
<script lang="ts">
  import type { Centuries } from "../app.svelte.js";
  import {
    after,
    before,
    centuryLabel,
    centuryOf,
    choices,
    explain,
    randomYear,
    sameCentury,
    span,
    yearLabel,
    type Century,
    type Question,
  } from "../century.js";
  import { starsFor } from "../../angielski/deck.js";
  import { systemRng } from "../../domain/random.js";
  import Confetti from "../../ui/Confetti.svelte";
  import { untrack } from "svelte";

  type Props = { app: Centuries };
  let { app }: Props = $props();

  const ROUND = 10;

  let index = $state(0);
  let question = $state<Question>({ value: 1410, era: "ne" });
  let options = $state<readonly Century[]>([]);
  let picked = $state<Century | null>(null);
  let right = $state(0);
  let streak = $state(0);
  let burst = $state(0);
  let record = $state(false);
  let asked = $state<readonly string[]>([]);

  const answer = $derived(centuryOf(question));
  const finished = $derived(index >= ROUND);
  const won = $derived(starsFor(right, ROUND));
  const ok = $derived(picked !== null && sameCentury(picked, answer));
  const ruler = $derived([before(answer), answer, after(answer)]);

  function deal(): void {
    // Bez powtórek w jednej rundzie.
    let q = randomYear(systemRng, app.both, app.famous);
    for (let i = 0; i < 20 && asked.includes(yearLabel(q)); i++) q = randomYear(systemRng, app.both, app.famous);
    asked = [...asked, yearLabel(q)];
    question = q;
    options = choices(q, app.both, systemRng);
    picked = null;
  }

  function start(): void {
    index = 0;
    right = 0;
    streak = 0;
    record = false;
    asked = [];
    deal();
  }

  function pick(c: Century): void {
    if (picked !== null) return;
    picked = c;
    if (sameCentury(c, answer)) {
      right += 1;
      streak += 1;
      app.addStars(1);
      if (app.streak(streak)) record = true;
      if (streak % 5 === 0) burst += 1;
    } else streak = 0;
  }

  function next(): void {
    if (picked === null) return;
    index += 1;
    if (index >= ROUND) {
      app.addStars(won);
      if (won >= 2) burst += 1;
    } else deal();
  }

  function key(e: KeyboardEvent): void {
    if (finished) return;
    const n = Number(e.key);
    const option = options[n - 1];
    if (picked === null && option !== undefined) pick(option);
    else if (picked !== null && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      next();
    }
  }

  // Nowa runda przy zmianie ustawień.
  $effect(() => {
    void app.both;
    void app.famous;
    untrack(start);
  });
</script>

<svelte:window onkeydown={key} />
<Confetti {burst} />

<div class="ages">
  <header class="ages-top">
    <h1>🏛️ Który to wiek?</h1>
    <span class="pill" title="Zebrane gwiazdki" data-test="stars">⭐ {app.stars}</span>
  </header>

  <div class="modes" role="group" aria-label="Zakres">
    <button aria-pressed={!app.both} data-test="mode-ne" onclick={() => app.setBoth(false)}>Nasza era</button>
    <button aria-pressed={app.both} data-test="mode-both" onclick={() => app.setBoth(true)}>Też p.n.e.</button>
  </div>
  <label class="famous">
    <input type="checkbox" checked={app.famous} onchange={(e) => app.setFamous(e.currentTarget.checked)} />
    Słynne daty z historii
  </label>

  {#if finished}
    <div class="finish" data-test="finish">
      <div class="trophy">{"⭐".repeat(won) || "💪"}</div>
      <h2>{won === 3 ? "Mistrz wieków!" : won >= 1 ? "Super!" : "Dobra próba!"}</h2>
      <p data-test="score">Dobrze: {right} z {ROUND}</p>
      <p>Rekord serii: {app.best} 🔥{record ? " — nowy rekord!" : ""}</p>
      <button class="big" data-test="again" onclick={start}>🔁 Jeszcze raz</button>
    </div>
  {:else}
    <div class="status">
      <span data-test="progress">Pytanie {index + 1} z {ROUND}</span>
      <span class="streak" class:hot={streak >= 3} data-test="streak">🔥 {streak}</span>
    </div>

    <div class="scroll" data-test="year">
      <div class="year">{yearLabel(question)}</div>
      {#if question.what !== undefined}<div class="what">📜 {question.what}</div>{/if}
      <div class="ask">Który to wiek?</div>
    </div>

    <div class="options">
      {#each options as c, i (centuryLabel(c))}
        <button
          class="option"
          class:ok={picked !== null && sameCentury(c, answer)}
          class:no={picked !== null && picked === c && !sameCentury(c, answer)}
          disabled={picked !== null}
          data-ok={sameCentury(c, answer) ? "1" : "0"}
          onclick={() => pick(c)}
        >
          <small>{i + 1}</small>{centuryLabel(c)}
        </button>
      {/each}
    </div>

    {#if picked !== null}
      <div class="verdict" class:good={ok} class:bad={!ok} data-test="verdict">
        <b>{ok ? "Brawo! 🎉" : `To ${centuryLabel(answer)}`}</b>
        <p>{explain(question)}</p>
        <div class="ruler" aria-label="Linijka czasu">
          {#each ruler as c, i (centuryLabel(c))}
            <div class="seg" class:here={i === 1}>
              <b>{centuryLabel(c)}</b>
              <span>{span(c)}</span>
              {#if i === 1}<i class="pin">📍 {question.value}</i>{/if}
            </div>
          {/each}
        </div>
      </div>
      <button class="big" data-test="next" onclick={next}>{index + 1 === ROUND ? "Wynik 🏁" : "Dalej ➜"}</button>
    {/if}
  {/if}

  <details class="help">
    <summary>📏 Jak liczyć wiek?</summary>
    <ol>
      <li>Zakryj dwie ostatnie cyfry roku i <b>dodaj 1</b>: 1410 → 14 + 1 = <b>XV w.</b></li>
      <li>Gdy rok kończy się na <b>00</b>, nic nie dodajesz: 1500 → <b>XV w.</b> (to ostatni rok wieku).</li>
      <li>Rok 1–100 to <b>I wiek</b>. Roku zerowego nie było.</li>
      <li>Przed naszą erą liczy się tak samo, tylko lata biegną wstecz: 753 p.n.e. → <b>VIII w. p.n.e.</b>
        (lata 800–701 p.n.e.).</li>
      <li>Wieki zapisujemy cyframi rzymskimi: I, II, III, IV, V, VI, VII, VIII, IX, X, XI … XX, XXI.</li>
    </ol>
  </details>

  <footer class="foot">Każdy ma swoje gwiazdki — zapisują się na jego telefonie lub tablecie.</footer>
</div>
