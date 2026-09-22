<!-- Quiz: dziesięć pytań pod rząd, obok sesji. Pomyłka cofa słowo do powtórki. -->
<script lang="ts">
  import type { Learning } from "../app/learning.svelte.js";
  import type { Word } from "../domain/types.js";
  import { distractorPool } from "../domain/exercise.js";
  import { untrack } from "svelte";
  import { pick, shuffle, systemRng } from "../domain/random.js";

  type Props = { app: Learning };
  let { app }: Props = $props();

  type Direction = "it-pl" | "pl-it" | "pr-it";
  const ROUND = 10;

  let direction = $state<Direction>("it-pl");
  let done = $state(0);
  let correct = $state(0);
  let word = $state<Word | null>(null);
  let options = $state<readonly Word[]>([]);
  let chosen = $state<Word | null>(null);

  const askItalian = $derived(direction !== "it-pl");

  function nextQuestion(): void {
    if (done >= ROUND) {
      done = 0;
      correct = 0;
    }
    const studied = distractorPool(app.pool, app.progress);
    const first = studied[0];
    if (first === undefined) return;
    const asked = pick([first, ...studied.slice(1)], systemRng);
    word = asked;
    chosen = null;
    options = shuffle(
      [asked, ...shuffle(studied.filter((w) => w.id !== asked.id), systemRng).slice(0, 3)],
      systemRng,
    );
  }

  function answer(option: Word): void {
    if (chosen !== null || word === null) return;
    chosen = option;
    done += 1;
    if (option.id === word.id) correct += 1;
    else app.penalise(word);
    if (app.voice) app.say(word.it);
  }

  function restart(): void {
    done = 0;
    correct = 0;
    nextQuestion();
  }

  // Nowe pytanie tylko po zmianie kierunku albo zakresu materiału. Bez `untrack`
  // samo zapisanie wpadki przestawiałoby pytanie w trakcie odpowiadania.
  $effect(() => {
    void direction;
    void app.pool;
    untrack(nextQuestion);
  });
</script>

<div class="row" style="margin-bottom:12px">
  <select bind:value={direction} aria-label="Kierunek pytań">
    <option value="it-pl">włoski → polski</option>
    <option value="pl-it">polski → włoski</option>
    <option value="pr-it">wymowa → włoski</option>
  </select>
  <span class="meta">Pytanie {Math.min(done + 1, ROUND)} z {ROUND}</span>
</div>

{#if word !== null}
  {@const asked = word}
  <div class="card">
    <div class="q">
      {direction === "it-pl" ? asked.it : direction === "pl-it" ? asked.pl : "[" + asked.pr + "]"}
    </div>
    <div class="q-pron">{direction === "it-pl" ? "[" + asked.pr + "]" : ""}</div>
    <div class="opts">
      {#each options as option (option.id)}
        <button
          class="opt"
          class:ok={chosen !== null && option.id === asked.id}
          class:no={chosen !== null && chosen.id === option.id && option.id !== asked.id}
          disabled={chosen !== null}
          onclick={() => answer(option)}
        >
          {askItalian ? option.it : option.pl}
        </button>
      {/each}
    </div>
    {#if chosen !== null}
      {@const good = chosen.id === asked.id}
      <div class="verdict" class:ok={good} class:no={!good}>
        {good ? "Dobrze! " : "Poprawnie: "}{asked.it} [{asked.pr}] — {asked.pl}
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick={nextQuestion}>Dalej</button>
      </div>
    {/if}
  </div>
{/if}

<div class="row" style="margin-top:12px;justify-content:space-between">
  <span class="meta">Wynik: {correct} / {done}</span>
  <button class="btn ghost" onclick={restart}>Nowa runda</button>
</div>
