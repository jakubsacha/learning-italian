<!-- Powłoka podstrony Marty: dwie zakładki i nic więcej do klikania. -->
<script lang="ts">
  import type { Marta } from "../app.svelte.js";
  import Learn from "./Learn.svelte";
  import Words from "./Words.svelte";

  type Props = { app: Marta };
  let { app }: Props = $props();

  let tab = $state<"learn" | "words">("learn");
</script>

<div class="wrap kid-wrap">
  <header class="top">
    <h1>Marta uczy się angielskiego</h1>
    <span class="score" title="Słówka, które już umiesz">⭐ {app.learned}</span>
  </header>

  <div class="tabs" role="tablist">
    <button role="tab" aria-selected={tab === "learn"} onclick={() => (tab = "learn")}>
      Nauka
    </button>
    <button role="tab" aria-selected={tab === "words"} onclick={() => (tab = "words")}>
      Słówka
    </button>
  </div>

  {#if tab === "learn"}
    <section class="panel" data-test="panel-learn"><Learn {app} /></section>
  {:else}
    <section class="panel" data-test="panel-words"><Words {app} /></section>
  {/if}

  <div class="sess-foot">
    <span data-test="stat">
      Poznane słówka: {app.started} z {app.deck.words.length} · umiesz: {app.learned}
    </span>
    <label class="chk">
      <input
        type="checkbox"
        checked={app.voice}
        onchange={(e) => app.setVoice(e.currentTarget.checked)}
      /> Czytaj na głos
    </label>
  </div>

  <footer>
    Wymowa zapisana polskimi literami (z grubsza) · <a href="../">kurs włoskiego taty</a>
  </footer>
</div>
