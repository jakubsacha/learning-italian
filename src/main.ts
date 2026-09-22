/**
 * Start aplikacji: składa porty z adapterami, podaje je do stanu i montuje
 * interfejs. To jedyne miejsce, które wie i o przeglądarce, i o domenie.
 */

import { mount } from "svelte";
import App from "./ui/App.svelte";
import "./ui/app.css";
import { Learning } from "./app/learning.svelte.js";
import { Cloud } from "./app/cloud.svelte.js";
import { browserStore, memoryStore } from "./storage/stores.js";
import { systemClock } from "./ports/clock.js";
import { webSpeech } from "./adapters/web-speech.js";
import { KEYS } from "./storage/saved.js";
import { asText } from "./storage/codec.js";
import { DAILY_GOAL, cloudConfigured } from "./config.js";

/**
 * Testy end-to-end chodzą po paczce zbudowanej w trybie `test` i podstawiają
 * atrapę chmury. W zwykłym budowaniu ta gałąź jest martwa i Vite ją usuwa.
 */
const UNDER_TEST = import.meta.env.MODE === "test";

const connect = async () => {
  if (UNDER_TEST) return (await import("./adapters/fake-sync.js")).fakeSync();
  if (!cloudConfigured()) return null;
  return (await import("./adapters/supabase-sync.js")).supabaseSync();
};

// W trybie prywatnym samo sięgnięcie po localStorage bywa błędem, nie tylko zapis.
const store = (() => {
  try {
    return browserStore(window.localStorage);
  } catch {
    return memoryStore();
  }
})();

const theme = asText(store.read(KEYS.theme));
if (theme !== null) document.documentElement.setAttribute("data-theme", theme);

const clock = systemClock;
const speech = webSpeech(window.speechSynthesis);

const cloudRef: { current: Cloud | null } = { current: null };
const app = new Learning({
  store,
  clock,
  speech,
  onProgress: () => cloudRef.current?.push(),
});

const cloud = new Cloud({
  learning: app,
  store,
  clock,
  connect,
  goal: (UNDER_TEST ? window.__GOAL : undefined) ?? DAILY_GOAL,
});
cloudRef.current = cloud;
void cloud.start();

// Zamknięta karta nie zdąży wysłać opóźnionego zapisu — wypychamy go od razu.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) void cloud.flush();
});

const target = document.getElementById("app");
if (target !== null) mount(App, { target, props: { app, cloud, store, now: clock.now() } });
