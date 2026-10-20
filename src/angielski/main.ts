/** Start podstrony z angielskim (Unit 2). Ten sam zapis i ta sama mowa co reszta. */

import { mount } from "svelte";
import App from "./ui/App.svelte";
import "../ui/app.css";
import "./angielski.css";
import { English } from "./app.svelte.js";
import { browserStore, memoryStore } from "../storage/stores.js";
import { webSpeech } from "../adapters/web-speech.js";

const store = (() => {
  try {
    return browserStore(window.localStorage);
  } catch {
    return memoryStore();
  }
})();

const app = new English({ store, speech: webSpeech(window.speechSynthesis, "en-GB") });

const target = document.getElementById("app");
if (target !== null) mount(App, { target, props: { app } });
