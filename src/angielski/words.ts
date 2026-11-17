/**
 * Słówka po unitach.
 * Unit 2 — niebieskie ramki w „Wordlist" (lekcje 2.1, 2.2, 2.4, 2.5); hasła spoza
 * ramek (at the weekend, Good question…) celowo pominięte.
 * Unit 3 — tylko pokoje i meble z zeszytu (bedroom, living room, bathroom).
 * `pr` to wymowa zapisana polskimi literami, z grubsza.
 */

export type Unit = 2 | 3;

export const UNITS: readonly Unit[] = [2, 3];

export type SectionId =
  | "ubrania"
  | "przymiotniki"
  | "pytania"
  | "rzeczy"
  | "sypialnia"
  | "salon"
  | "lazienka";

export type Section = {
  readonly id: SectionId;
  readonly unit: Unit;
  readonly lesson: string;
  readonly label: string;
  readonly icon: string;
};

export const SECTIONS: readonly Section[] = [
  { id: "ubrania", unit: 2, lesson: "2.1", label: "Ubrania", icon: "👕" },
  { id: "przymiotniki", unit: 2, lesson: "2.2", label: "Przymiotniki", icon: "🐘" },
  { id: "pytania", unit: 2, lesson: "2.4", label: "Pytania", icon: "💬" },
  { id: "rzeczy", unit: 2, lesson: "2.5", label: "Moje rzeczy", icon: "🎒" },
  { id: "sypialnia", unit: 3, lesson: "3", label: "Bedroom", icon: "🛏️" },
  { id: "salon", unit: 3, lesson: "3", label: "Living room", icon: "📺" },
  { id: "lazienka", unit: 3, lesson: "3", label: "Bathroom", icon: "🛁" },
];

export const sectionsOf = (unit: Unit): readonly Section[] => SECTIONS.filter((s) => s.unit === unit);

const UNIT_OF: Readonly<Record<SectionId, Unit>> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s.unit]),
) as Record<SectionId, Unit>;

export const unitOf = (id: SectionId): Unit => UNIT_OF[id];

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
const be = card("sypialnia");
const li = card("salon");
const ba = card("lazienka");

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

  be("bedroom", "sypialnia", "bedrum", { draw: "bedroom" }),
  be("bed", "łóżko", "bed", { draw: "bed" }),
  be("desk", "biurko", "desk", { draw: "desk" }),
  be("chair", "krzesło", "czer", { draw: "chair" }),
  be("wardrobe", "szafa", "łordroub", { draw: "wardrobe" }),

  li("living room", "salon, pokój dzienny", "liwing rum", { draw: "livingroom" }),
  li("TV", "telewizor", "ti wi", { draw: "tv" }),
  li("sofa", "kanapa, sofa", "soufa", { draw: "sofa" }),
  li("armchair", "fotel", "armczer", { draw: "armchair" }),

  ba("bathroom", "łazienka", "bafrum", { draw: "bathroom" }),
  ba("toilet", "toaleta, sedes", "tojlet", { draw: "toilet" }),
  ba("bath", "wanna", "baf", { draw: "bath" }),
  ba("shower", "prysznic", "szałer", { draw: "shower" }),
];

export const cardsOf = (unit: Unit): readonly Card[] => CARDS.filter((c) => unitOf(c.section) === unit);

/** Pokoje Unitu 3 i to, co w nich stoi — do gry „Pokoje". */
export const ROOMS: readonly { readonly section: SectionId; readonly room: string }[] = [
  { section: "sypialnia", room: "bedroom" },
  { section: "salon", room: "living room" },
  { section: "lazienka", room: "bathroom" },
];

export const isRoom = (c: Card): boolean => ROOMS.some((r) => r.room === c.en);

export const inSections = (cards: readonly Card[], sections: ReadonlySet<SectionId>): Card[] =>
  cards.filter((c) => sections.has(c.section));

/**
 * Działy wybranego unitu, które są zaznaczone. Gdy z tego unitu nic nie jest
 * zaznaczone (np. pierwsze wejście do nowego unitu), liczą się wszystkie jego działy.
 */
export function activeIn(unit: Unit, selected: ReadonlySet<SectionId>): ReadonlySet<SectionId> {
  const own = SECTIONS.filter((s) => s.unit === unit).map((s) => s.id);
  const picked = own.filter((id) => selected.has(id));
  return new Set(picked.length > 0 ? picked : own);
}

/** Gdzie co stoi — zdanie z odpowiedzią do gry „Pokoje". */
const IN_ROOM_PL: Readonly<Partial<Record<SectionId, string>>> = {
  sypialnia: "w sypialni",
  salon: "w salonie",
  lazienka: "w łazience",
};

export function roomSentence(c: Card): { readonly en: string; readonly pl: string } {
  const room = ROOMS.find((r) => r.section === c.section)?.room ?? "";
  const thing = c.pl.split(",")[0] ?? c.pl;
  return {
    en: `The ${c.en} is in the ${room}.`,
    pl: `${thing.charAt(0).toUpperCase()}${thing.slice(1)} jest ${IN_ROOM_PL[c.section] ?? ""}.`,
  };
}

/** Meble Unitu 3 bez samych pokoi — to je się przypisuje do pokoju. */
export const FURNITURE: readonly Card[] = CARDS.filter((c) => unitOf(c.section) === 3 && !isRoom(c));
