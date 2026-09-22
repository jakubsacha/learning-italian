/**
 * Wymowa przez Web Speech API. Głosy w Chrome dochodzą asynchronicznie, więc
 * lista bywa pusta przy pierwszym pytaniu i zapełnia się chwilę później —
 * stąd nasłuch na `voiceschanged`.
 */

import type { Speech } from "../ports/speech.js";

/** Trochę wolniej niż normalnie — przy nauce liczy się wyraźność, nie tempo. */
const RATE = 0.9;

const italian = (voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null =>
  voices.find((v) => v.lang.toLowerCase().startsWith("it")) ?? null;

export function webSpeech(synth: SpeechSynthesis | undefined): Speech {
  if (synth === undefined) {
    return { available: false, say: () => {}, onChange: () => {} };
  }
  let voice = italian(synth.getVoices());
  const listeners: (() => void)[] = [];
  synth.addEventListener("voiceschanged", () => {
    voice = italian(synth.getVoices());
    for (const listener of listeners) listener();
  });
  return {
    get available() {
      return voice !== null;
    },
    say(text) {
      if (text === "") return;
      try {
        synth.cancel();
        // "scusi / scusa" czytane z ukośnikiem brzmi jak literowanie.
        const utterance = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ", "));
        utterance.lang = "it-IT";
        utterance.rate = RATE;
        if (voice !== null) utterance.voice = voice;
        synth.speak(utterance);
      } catch {
        /* zablokowana synteza nie może przerwać nauki */
      }
    },
    onChange(listener) {
      listeners.push(listener);
    },
  };
}

/** Cisza — do testów i do przeglądarek bez syntezatora. */
export const noSpeech: Speech = { available: false, say: () => {}, onChange: () => {} };
