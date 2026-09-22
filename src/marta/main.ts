/**
 * Start podstrony Marty. Osobne wejście, ten sam rdzeń: domena, porty i
 * adaptery są wspólne z kursem włoskim, różni się materiał, zapis i wygląd.
 */

import { mount } from "svelte";
import App from "./ui/App.svelte";
import "../ui/app.css";
import "./marta.css";
import { Marta } from "./app.svelte.js";
import { browserStore, memoryStore } from "../storage/stores.js";
import { systemClock } from "../ports/clock.js";
import { webSpeech } from "../adapters/web-speech.js";

const store = (() => {
  try {
    return browserStore(window.localStorage);
  } catch {
    return memoryStore();
  }
})();

const app = new Marta({
  store,
  clock: systemClock,
  speech: webSpeech(window.speechSynthesis, "en-GB"),
});

const target = document.getElementById("app");
if (target !== null) mount(App, { target, props: { app } });
