/**
 * Karta pracy do druku z Unitu 3 (pokoje i meble): słowniczek obrazkowy
 * i ćwiczenia z kluczem odpowiedzi. Rysunki i słówka są te same co w aplikacji.
 *
 *   node scripts/print-unit3.mjs        → public/angielski/unit3-dom.pdf
 *
 * Node 22+ czyta pliki .ts bez kompilacji (dane nie mają importów).
 * CHROMIUM_PATH wskazuje przeglądarkę, jeśli Playwright jej sam nie znajdzie.
 */

import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { ART } from "../src/angielski/art.ts";
import { CARDS, FURNITURE, ROOMS, roomSentence } from "../src/angielski/words.ts";

const OUT = new URL("../public/angielski/unit3-dom.pdf", import.meta.url).pathname;

const pic = (card, size) =>
  `<svg viewBox="0 0 100 100" width="${size}" height="${size}">${ART[card.art.draw] ?? ""}</svg>`;
const byEn = (en) => CARDS.find((c) => c.en === en);
const inRoom = (section) => CARDS.filter((c) => c.section === section && !ROOMS.some((r) => r.room === c.en));

// Stała, „wymieszana" kolejność — karta ma wyglądać tak samo przy każdym wydruku.
const MIXED = ["sofa", "bath", "desk", "TV", "wardrobe", "toilet", "chair", "armchair", "shower", "bed"].map(byEn);
const MATCH_EN = ["bedroom", "chair", "bathroom", "sofa", "wardrobe", "shower"];
const MATCH_PL = ["krzesło", "prysznic", "sypialnia", "szafa", "łazienka", "kanapa"];
const SENTENCES = ["bed", "TV", "shower", "desk"].map(byEn);

const dictionary = ROOMS.map((r) => {
  const room = byEn(r.room);
  return `
  <section class="room">
    <div class="room-head">${pic(room, 64)}<div><h2>${room.en}</h2><p>${room.pl} · <i>czytaj: ${room.pr}</i></p></div></div>
    <div class="things">${inRoom(r.section)
      .map((c) => `<div class="thing">${pic(c, 62)}<b>${c.en}</b><span>${c.pl.split(",")[0]}</span><i>${c.pr}</i></div>`)
      .join("")}</div>
  </section>`;
}).join("");

const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Unit 3 — My home</title>
<style>
@page { size: A4; margin: 11mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 11pt/1.35 "Nunito", "DejaVu Sans", Arial, sans-serif; color: #23384d; }
.page { height: 274mm; position: relative; page-break-after: always; overflow: hidden; }
.page:last-child { page-break-after: auto; }
h1 { margin: 0 0 2mm; font-size: 20pt; color: #0e7f9e; }
h1 small { font-size: 11pt; color: #6b8193; font-weight: 600; }
.name { position: absolute; top: 0; right: 0; font-size: 10pt; color: #6b8193; }
.room { border: 2px solid #1aa3c8; border-radius: 5mm; padding: 3mm 4mm; margin-bottom: 4mm; break-inside: avoid; }
.room-head { display: flex; align-items: center; gap: 4mm; }
.room-head h2 { margin: 0; font-size: 16pt; color: #0e7f9e; }
.room-head p { margin: 0; font-size: 10pt; }
.things { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 2mm; }
.thing { display: flex; flex-direction: column; align-items: center; text-align: center; border: 1px dashed #9cc7d8; border-radius: 3mm; padding: 2mm 1mm; }
.thing b { font-size: 13pt; color: #0e7f9e; }
.thing span { font-size: 10pt; }
.thing i { font-size: 8.5pt; color: #6b8193; }
.draw { border: 2px dashed #1aa3c8; border-radius: 5mm; padding: 3mm 4mm; height: 62mm; }
.draw h3 { margin: 0; font-size: 12.5pt; }
.draw h3 span { margin-right: 2mm; }
.ex { margin-bottom: 5mm; break-inside: avoid; }
.ex h3 { margin: 0 0 2mm; font-size: 12.5pt; }
.ex h3 span { display: inline-block; width: 7mm; height: 7mm; line-height: 7mm; text-align: center; border-radius: 50%; background: #1aa3c8; color: #fff; margin-right: 2mm; font-size: 10pt; }
.write { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; }
.write div { display: flex; flex-direction: column; align-items: center; }
.write div::after { content: ""; display: block; width: 90%; border-bottom: 1.5px solid #23384d; height: 8mm; }
.bank { border: 1.5px dashed #23384d; border-radius: 3mm; padding: 2mm 3mm; margin-bottom: 2mm; text-align: center; letter-spacing: .5px; }
.cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
.col { border: 1.5px solid #9cc7d8; border-radius: 3mm; padding: 2mm 3mm; }
.col b { display: block; text-align: center; color: #0e7f9e; }
.col i { display: block; border-bottom: 1px solid #9cc7d8; height: 7.5mm; }
.match { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 30mm; font-size: 12pt; width: 75%; margin-left: 6mm; }
.match .l::after { content: " •"; float: right; }
.match .r::before { content: "• "; }
.sent p { margin: 0 0 2.5mm; font-size: 12pt; }
.sent p::after { content: ""; display: inline-block; width: 38mm; border-bottom: 1.5px solid #23384d; margin-left: 2mm; }
.key { position: absolute; bottom: 0; left: 0; right: 0; transform: rotate(180deg); font-size: 7.5pt; color: #6b8193; border-top: 1px dotted #9cc7d8; padding-top: 1.5mm; }
</style></head><body>

<div class="page">
  <h1>My home 🏠 <small>Unit 3 · słowniczek obrazkowy</small></h1>
  ${dictionary}
  <div class="draw"><h3><span>✏️</span>Narysuj swój pokój i podpisz meble po angielsku.</h3></div>
</div>

<div class="page">
  <span class="name">Imię: ____________________</span>
  <h1>My home ✏️ <small>Unit 3 · ćwiczenia</small></h1>

  <div class="ex"><h3><span>1</span>Napisz po angielsku, co jest na obrazku.</h3>
    <div class="write">${MIXED.map((c) => `<div>${pic(c, 54)}</div>`).join("")}</div>
  </div>

  <div class="ex"><h3><span>2</span>Co stoi w którym pokoju? Wpisz słowa z ramki.</h3>
    <div class="bank">${MIXED.map((c) => c.en).join(" · ")}</div>
    <div class="cols">${ROOMS.map((r) => `<div class="col"><b>${r.room}</b>${"<i></i>".repeat(4)}</div>`).join("")}</div>
  </div>

  <div class="ex"><h3><span>3</span>Połącz słowo z tłumaczeniem.</h3>
    <div class="match">${MATCH_EN.map((en, i) => `<span class="l">${en}</span><span class="r">${MATCH_PL[i]}</span>`).join("")}</div>
  </div>

  <div class="ex sent"><h3><span>4</span>Dokończ zdanie.</h3>
    ${SENTENCES.map((c) => `<p>The ${c.en} is in the</p>`).join("")}
  </div>

  <div class="key"><b>Odpowiedzi:</b>
    1. ${MIXED.map((c) => c.en).join(", ")} ·
    2. ${ROOMS.map((r) => `${r.room}: ${inRoom(r.section).map((c) => c.en).join(", ")}`).join("; ")} ·
    3. ${MATCH_EN.map((en) => `${en} – ${byEn(en).pl.split(",")[0]}`).join(", ")} ·
    4. ${SENTENCES.map((c) => roomSentence(c).en).join(" ")}
  </div>
</div>
</body></html>`;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: OUT, format: "A4", preferCSSPageSize: true, printBackground: true });
if (process.env.PREVIEW) {
  writeFileSync(process.env.PREVIEW + "/unit3.html", html);
}
await browser.close();
console.log("zapisano", OUT);
