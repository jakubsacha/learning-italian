/**
 * Materiał rozmówek: dwanaście sytuacji z dialogami, a po nich zdania z kursu
 * jako ostatnia grupa. Dzięki temu dawna zakładka Zdania niczego nie gubi —
 * jej zdania ćwiczy się teraz tak samo, tylko z pamięcią powtórek.
 */

import { asFiniteNumber, asOneOf, asText, isRecord } from "../storage/codec.js";
import type { Phrase, Scene, SceneId, Speaker } from "../domain/phrases/types.js";
import { asPhraseId, asSceneId } from "../domain/phrases/types.js";
import rawScenes from "./scenes.json";
import rawSentences from "./sentences.json";

const SPEAKERS: readonly Speaker[] = ["ty", "oni"];

/** Grupa dla zdań z kursu — nie jest dialogiem, więc wszystkie kwestie są Twoje. */
export const COURSE_SCENE = asSceneId("kurs");

function decodeScene(value: unknown, taken: Set<string>): Scene | null {
  if (!isRecord(value)) return null;
  const id = asText(value["id"]);
  const title = asText(value["title"]);
  if (id === null || title === null || !Array.isArray(value["lines"])) return null;
  const scene = asSceneId(id);
  const phrases: Phrase[] = [];
  for (const line of value["lines"] as unknown[]) {
    if (!isRecord(line)) continue;
    const it = asText(line["it"]);
    const pl = asText(line["pl"]);
    const who = asOneOf(line["who"], SPEAKERS);
    if (it === null || pl === null || who === null) continue;
    // Kwestia jest swoim kluczem w zapisie, więc powtórka w innej sytuacji
    // dzieliłaby postęp. Zostaje pierwsza.
    if (taken.has(it)) continue;
    taken.add(it);
    phrases.push({ id: asPhraseId(it), it, pl, who, scene, order: phrases.length });
  }
  return phrases.length === 0
    ? null
    : { id: scene, icon: asText(value["icon"]) ?? "💬", title, phrases };
}

function courseScene(taken: Set<string>): Scene | null {
  const entries = (rawSentences as unknown[])
    .filter(isRecord)
    .map((s) => ({
      it: asText(s["it"]),
      pl: asText(s["pl"]),
      level: asFiniteNumber(s["l"]) ?? 1,
    }))
    .filter((s): s is { it: string; pl: string; level: number } => s.it !== null && s.pl !== null)
    // Od najprostszych: poziom rośnie tak samo jak w słownictwie.
    .sort((a, b) => a.level - b.level);
  const phrases: Phrase[] = [];
  for (const { it, pl } of entries) {
    if (taken.has(it)) continue;
    taken.add(it);
    phrases.push({ id: asPhraseId(it), it, pl, who: "ty", scene: COURSE_SCENE, order: phrases.length });
  }
  return phrases.length === 0
    ? null
    : { id: COURSE_SCENE, icon: "📚", title: "Zdania z kursu", phrases };
}

const taken = new Set<string>();
const situations = (rawScenes as unknown[])
  .map((s) => decodeScene(s, taken))
  .filter((s): s is Scene => s !== null);
const course = courseScene(taken);

export const SCENES: readonly Scene[] = course === null ? situations : [...situations, course];

export const sceneById = (id: SceneId): Scene | undefined => SCENES.find((s) => s.id === id);
