/**
 * Unit 2 — słówka z niebieskich ramek w „Wordlist" (lekcje 2.1, 2.2, 2.4, 2.5).
 * Hasła spoza ramek (at the weekend, Good question…) celowo pominięte.
 * `pr` to wymowa zapisana polskimi literami, z grubsza.
 */

export type SectionId = "ubrania" | "przymiotniki" | "pytania" | "rzeczy";

export type Section = {
  readonly id: SectionId;
  readonly lesson: string;
  readonly label: string;
  readonly icon: string;
};

export const SECTIONS: readonly Section[] = [
  { id: "ubrania", lesson: "2.1", label: "Ubrania", icon: "👕" },
  { id: "przymiotniki", lesson: "2.2", label: "Przymiotniki", icon: "🐘" },
  { id: "pytania", lesson: "2.4", label: "Pytania", icon: "💬" },
  { id: "rzeczy", lesson: "2.5", label: "Moje rzeczy", icon: "🎒" },
];

/** Obrazek: własny rysunek z `art.ts` albo emoji. */
export type Art = { readonly draw: string } | { readonly emoji: string };

export type Card = {
  readonly en: string;
  readonly pl: string;
  readonly pr: string;
  readonly section: SectionId;
  readonly art: Art;
};

const card =
  (section: SectionId) =>
  (en: string, pl: string, pr: string, art: Art): Card => ({ en, pl, pr, section, art });

const ub = card("ubrania");
const ad = card("przymiotniki");
const qu = card("pytania");
const th = card("rzeczy");

export const CARDS: readonly Card[] = [
  ub("boots", "buty, kozaki", "buts", { draw: "boots" }),
  ub("cap", "czapka", "kep", { draw: "cap" }),
  ub("coat", "płaszcz, kurtka", "kołt", { draw: "coat" }),
  ub("dress", "sukienka", "dres", { draw: "dress" }),
  ub("hoodie", "bluza z kapturem", "hudi", { draw: "hoodie" }),
  ub("jacket", "kurtka", "dżeket", { draw: "jacket" }),
  ub("jeans", "dżinsy", "dżinz", { draw: "jeans" }),
  ub("jumper", "bluza, sweter", "dżamper", { draw: "jumper" }),
  ub("shirt", "koszula", "szert", { draw: "shirt" }),
  ub("shoes", "buty", "szuz", { draw: "shoes" }),
  ub("skirt", "spódnica", "skert", { draw: "skirt" }),
  ub("T-shirt", "koszulka z krótkim rękawem", "tiszert", { draw: "tshirt" }),
  ub("top", "bluzka, koszulka", "top", { draw: "top" }),
  ub("tracksuit", "dres", "treksut", { draw: "tracksuit" }),
  ub("trainers", "trampki, buty sportowe", "trejnerz", { draw: "trainers" }),
  ub("trousers", "spodnie", "trałzerz", { draw: "trousers" }),

  ad("big", "duży", "big", { emoji: "🐘" }),
  ad("boring", "nudny", "boring", { emoji: "🥱" }),
  ad("cool", "fajny", "kul", { emoji: "😎" }),
  ad("long", "długi", "long", { emoji: "🐍" }),
  ad("new", "nowy", "niu", { emoji: "🎁" }),
  ad("old", "stary", "ołld", { emoji: "👴" }),
  ad("short", "krótki", "szort", { emoji: "🩳" }),
  ad("small", "mały", "smol", { emoji: "🐭" }),

  qu("How old are you?", "Ile masz lat?", "hał ołld ar ju", { emoji: "🎂" }),
  qu("What's your favourite film?", "Jaki jest twój ulubiony film?", "łots jor fejweryt film", { emoji: "🎬" }),
  qu("What's your favourite music?", "Jaką muzykę najbardziej lubisz?", "łots jor fejweryt miuzik", { emoji: "🎵" }),
  qu("What's your favourite sport?", "Jaki jest twój ulubiony sport?", "łots jor fejweryt sport", { emoji: "⚽" }),
  qu("What's your name?", "Jak masz na imię?", "łots jor nejm", { emoji: "👋" }),
  qu("Where are you from?", "Skąd jesteś?", "łer ar ju from", { emoji: "🌍" }),
  qu("Who's your favourite actor?", "Kto jest twoim ulubionym aktorem?", "huz jor fejweryt ektor", { emoji: "🎭" }),
  qu("Who's your favourite singer?", "Kto jest twoim ulubionym piosenkarzem?", "huz jor fejweryt singer", { emoji: "🎤" }),
  qu("Who's your favourite sports person?", "Kto jest twoim ulubionym sportowcem?", "huz jor fejweryt sports pyrsn", { emoji: "🏅" }),

  th("backpack", "plecak", "bekpek", { draw: "backpack" }),
  th("headphones", "słuchawki", "hedfołnz", { draw: "headphones" }),
  th("keys", "klucze", "kiz", { draw: "keys" }),
  th("mountain bike", "rower górski", "małntyn bajk", { draw: "bike" }),
  th("smartphone", "smartfon", "smartfołn", { draw: "smartphone" }),
  th("tablet", "tablet", "teblyt", { draw: "tablet" }),
];

export const inSections = (cards: readonly Card[], sections: ReadonlySet<SectionId>): Card[] =>
  cards.filter((c) => sections.has(c.section));
