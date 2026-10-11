/** Start podstrony z historią. Rdzeń wspólny z resztą: zapis, zegar, harmonogram powtórek. */

import { mount } from "svelte";
import App from "./ui/App.svelte";
import "../ui/app.css";
import "./historia.css";
import { History } from "./app.svelte.js";
import { browserStore, memoryStore } from "../storage/stores.js";
import { systemClock } from "../ports/clock.js";

const store = (() => {
  try {
    return browserStore(window.localStorage);
  } catch {
    return memoryStore();
  }
})();

const app = new History({ store, clock: systemClock });

const target = document.getElementById("app");
if (target !== null) mount(App, { target, props: { app } });
