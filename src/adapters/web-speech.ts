/**
 * Wymowa przez Web Speech API. Głosy w Chrome dochodzą asynchronicznie, więc
 * lista bywa pusta przy pierwszym pytaniu i zapełnia się chwilę później —
 * stąd nasłuch na `voiceschanged`.
 */

import type { Speech } from "../ports/speech.js";

/** Trochę wolniej niż normalnie — przy nauce liczy się wyraźność, nie tempo. */
const RATE = 0.9;

const forLanguage = (
  voices: readonly SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null => {
  const prefix = lang.slice(0, 2).toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null;
};

/** `lang` to kod BCP 47: "it-IT" dla włoskiego, "en-GB" dla angielskiego. */
export function webSpeech(synth: SpeechSynthesis | undefined, lang: string): Speech {
  if (synth === undefined) {
    return { available: false, say: () => {}, onChange: () => {} };
  }
  let voice = forLanguage(synth.getVoices(), lang);
  const listeners: (() => void)[] = [];
  synth.addEventListener("voiceschanged", () => {
    voice = forLanguage(synth.getVoices(), lang);
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
        utterance.lang = lang;
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
