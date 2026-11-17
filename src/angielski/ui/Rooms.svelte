<!--
  „Pokoje": mebel na karcie, trzy pokoje do wyboru. Po odpowiedzi zdanie
  „The bed is in the bedroom." czytane na głos i po polsku.
-->
<script lang="ts">
  import type { English } from "../app.svelte.js";
  import { CARDS, FURNITURE, ROOMS, roomSentence, type Card, type SectionId } from "../words.js";
  import { starsFor } from "../deck.js";
  import { shuffle, systemRng } from "../../domain/random.js";
  import Picture from "./Picture.svelte";
  import Confetti from "../../ui/Confetti.svelte";

  type Props = { app: English };
  let { app }: Props = $props();

  let deck = $state<readonly Card[]>(shuffle(FURNITURE, systemRng));
  let index = $state(0);
  let picked = $state<SectionId | null>(null);
  let right = $state(0);
  let burst = $state(0);

  const current = $derived(deck[index]);
  const won = $derived(starsFor(right, deck.length));
  const roomCard = (room: string) => CARDS.find((c) => c.en === room);

  function start(): void {
    deck = shuffle(FURNITURE, systemRng);
    index = 0;
    picked = null;
    right = 0;
  }

  function pick(section: SectionId): void {
    if (picked !== null || current === undefined) return;
    picked = section;
    app.say(roomSentence(current).en);
    if (section === current.section) {
      right += 1;
      app.addStars(1);
    }
  }

  function next(): void {
    index += 1;
    picked = null;
    if (index >= deck.length) {
      app.addStars(won);
      if (won >= 2) burst += 1;
    }
  }
</script>

<Confetti {burst} />

{#if current === undefined}
  <div class="finish" data-test="rooms-over">
    <div class="trophy">{"⭐".repeat(won) || "💪"}</div>
    <h2>{won === 3 ? "Wszystko na swoim miejscu!" : won >= 1 ? "Super!" : "Dobra próba!"}</h2>
    <p data-test="rooms-score">Dobrze: {right} z {deck.length}</p>
    <button class="big-btn good" data-test="rooms-again" onclick={start}>🏠 Jeszcze raz</button>
  </div>
{:else}
  <div class="game-top"><span data-test="rooms-progress">{index + 1} z {deck.length}</span></div>
  <div class="question" data-test="thing">
    <Picture art={current.art} />
    <div class="sentence">{current.en}</div>
    <div class="ask">W którym pokoju to stoi?</div>
  </div>

  <div class="rooms">
    {#each ROOMS as r (r.section)}
      {@const rc = roomCard(r.room)}
      <button
        class="room-btn"
        class:ok={picked !== null && r.section === current.section}
        class:no={picked === r.section && r.section !== current.section}
        disabled={picked !== null}
        data-room={r.section}
        data-ok={r.section === current.section ? "1" : "0"}
        onclick={() => pick(r.section)}
      >
        {#if rc !== undefined}<Picture art={rc.art} size="small" />{/if}
        <span>{r.room}</span>
      </button>
    {/each}
  </div>

  {#if picked !== null}
    <div class="point-verdict" class:good={picked === current.section} data-test="rooms-verdict">
      <b>{picked === current.section ? "Brawo! 🎉" : "Nie tutaj!"}</b>
      <p class="full">{roomSentence(current).en}</p>
      <p class="pl">{roomSentence(current).pl}</p>
    </div>
    <button class="big-btn show" data-test="rooms-next" onclick={next}>
      {index + 1 === deck.length ? "Wynik 🏁" : "Dalej ➜"}
    </button>
  {/if}
{/if}
