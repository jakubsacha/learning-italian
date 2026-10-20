/** Start gry „Który to wiek?". */

import { mount } from "svelte";
import App from "./ui/App.svelte";
import "../ui/app.css";
import "./wieki.css";
import { Centuries } from "./app.svelte.js";
import { browserStore, memoryStore } from "../storage/stores.js";

const store = (() => {
  try {
    return browserStore(window.localStorage);
  } catch {
    return memoryStore();
  }
})();

const target = document.getElementById("app");
if (target !== null) mount(App, { target, props: { app: new Centuries(store) } });
