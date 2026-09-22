<!-- Konto, tablica wyników i wspólny cel na dziś. -->
<script lang="ts">
  import type { Cloud } from "../app/cloud.svelte.js";
  import { days, percent } from "./format.js";

  type Props = { cloud: Cloud };
  let { cloud }: Props = $props();

  let open = $state(false);
  let username = $state("");
  let password = $state("");
  let error = $state("");

  const cloudState = $derived(cloud.state);
  const me = $derived(cloudState.status === "signed-in" ? cloudState.username : null);

  function show(): void {
    error = "";
    open = true;
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    error = (await cloud.signIn({ username, password })) ?? "";
    if (error === "") open = false;
  }

  async function register(): Promise<void> {
    error = (await cloud.signUp({ username, password })) ?? "";
    if (error === "") open = false;
  }
</script>

<section class="sync">
  <div class="sync-row">
    <span class="sync-who">
      <span class="dot" class:on={cloudState.status === "signed-in"} class:err={cloudState.status === "error"}
      ></span>
      {#if cloudState.status === "signed-in"}
        Zalogowano jako <b>{cloudState.username}</b> — postęp zapisany w chmurze
      {:else if cloudState.status === "error"}
        {cloudState.message}
      {:else if cloudState.status === "unconfigured"}
        Tryb lokalny — uzupełnij <code>src/config.ts</code>, żeby włączyć konta
      {:else}
        Tryb lokalny — postęp tylko w tej przeglądarce
      {/if}
    </span>
    {#if cloudState.status === "signed-in"}
      <button class="btn ghost" onclick={() => void cloud.signOut()}>Wyloguj</button>
    {:else if cloudState.status !== "unconfigured"}
      <button class="btn ghost" onclick={show}>Zaloguj</button>
    {/if}
  </div>

  {#if cloudState.status === "signed-in" && cloudState.board.length > 0}
    {@const goal = cloud.goal}
    {@const top = Math.max(1, ...cloudState.board.map((r) => r.today))}
    <div class="board show">
      <div class="board-head">Wspólny cel na dziś</div>
      <div class="goal" class:hit={goal.done}>
        <div class="goal-label">
          {goal.done
            ? "Cel zrobiony: " + goal.total + " / " + goal.target + " fiszek 🎉"
            : goal.total +
              " / " +
              goal.target +
              " fiszek — brakuje " +
              (goal.target - goal.total)}
        </div>
        <div class="goal-track">
          <i style="width:{Math.min(100, percent(goal.total, goal.target))}%"></i>
        </div>
        {#if goal.streak > 0}
          <div class="goal-streak">Wspólna seria: {days(goal.streak)} pod rząd</div>
        {/if}
      </div>
      {#each cloudState.board as row (row.username)}
        <div class="board-row" class:me={row.username === me}>
          <span class="nick">{row.username}</span>
          <span class="track"><i style="width:{percent(row.today, top)}%"></i></span>
          <span class="num">{row.today} dziś · {row.mature} utrw.</span>
        </div>
      {/each}
    </div>
  {/if}
</section>

{#if open}
  <dialog class="auth" open>
    <form class="auth-in" onsubmit={submit}>
      <h2>Twoja nazwa</h2>
      <p class="note">Bez e-maila. Nazwa jest zajmowana na stałe przy zakładaniu konta.</p>
      <label for="auth-user">Nazwa (np. monika)</label>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        id="auth-user"
        bind:value={username}
        autocomplete="username"
        autocapitalize="none"
        autocorrect="off"
        spellcheck="false"
        autofocus
        required
      />
      <label for="auth-pass">Hasło (min. 6 znaków)</label>
      <input
        id="auth-pass"
        bind:value={password}
        type="password"
        autocomplete="current-password"
        minlength="6"
        required
      />
      {#if error !== ""}
        <div class="auth-err show">{error}</div>
      {/if}
      <div class="auth-btns">
        <button class="btn ghost" type="button" disabled={cloud.busy} onclick={register}>
          Załóż konto
        </button>
        <button class="btn good" type="submit" disabled={cloud.busy}>Zaloguj</button>
      </div>
      <div class="auth-btns">
        <button class="btn ghost" type="button" onclick={() => (open = false)}>Anuluj</button>
      </div>
    </form>
  </dialog>
{/if}
