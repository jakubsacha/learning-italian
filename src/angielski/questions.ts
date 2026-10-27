/**
 * Pytania z „be" przez inwersję: czasownik przeskakuje przed podmiot.
 *   You are happy.  →  Are you happy?
 * Krótkie odpowiedzi powtarzają podmiot i czasownik, a „tak" nigdy nie ma
 * skrótu: Yes, I am. (nie „Yes, I'm."), ale No, I'm not.
 * Pytania to ćwiczenie 8 z podręcznika i kilka podobnych; „Kto to?" to
 * tabelka z ćwiczenia 9.
 */

import { shuffle, type Rng } from "../domain/random.js";

export type Be = "am" | "is" | "are";

/** Kto pyta o kogo: podmiot w pytaniu i w odpowiedzi. */
type Person = {
  readonly subject: string;
  readonly verb: Be;
  /** Podmiot w odpowiedzi: na „you" odpowiada się „I", na „I" — „you". */
  readonly reply: string;
  readonly replyVerb: Be;
  /** Zły podmiot do pułapki w odpowiedziach. */
  readonly trap: string;
};

const PEOPLE: Readonly<Record<string, Person>> = {
  I: { subject: "I", verb: "am", reply: "you", replyVerb: "are", trap: "I" },
  you: { subject: "you", verb: "are", reply: "I", replyVerb: "am", trap: "you" },
  we: { subject: "we", verb: "are", reply: "we", replyVerb: "are", trap: "they" },
  he: { subject: "he", verb: "is", reply: "he", replyVerb: "is", trap: "she" },
  she: { subject: "she", verb: "is", reply: "she", replyVerb: "is", trap: "he" },
  it: { subject: "it", verb: "is", reply: "it", replyVerb: "is", trap: "he" },
  they: { subject: "they", verb: "are", reply: "they", replyVerb: "are", trap: "we" },
};

export type Item = {
  readonly subject: string;
  readonly verb: Be;
  readonly rest: string;
  readonly reply: string;
  readonly replyVerb: Be;
  readonly trap: string;
  readonly pl: string;
};

/** Pytanie o osobę z tabeli zaimków albo o rzecz/imię, które odpowiada zaimkiem. */
const q = (who: string, rest: string, pl: string, as?: string): Item => {
  const p = PEOPLE[as ?? who] ?? PEOPLE["it"];
  if (p === undefined) throw new Error(who);
  return { subject: as === undefined ? p.subject : who, verb: p.verb, rest, reply: p.reply, replyVerb: p.replyVerb, trap: p.trap, pl };
};

export const ITEMS: readonly Item[] = [
  q("you", "ten years old", "Czy masz dziesięć lat?"),
  q("you", "happy", "Czy jesteś szczęśliwy/szczęśliwa?"),
  q("we", "friends", "Czy jesteśmy przyjaciółmi?"),
  q("Superdug and Kit", "cool", "Czy Superdug i Kit są fajni?", "they"),
  q("you", "clever", "Czy jesteś mądry/mądra?"),
  q("I", "a superhero", "Czy jestem superbohaterem?"),
  q("he", "British", "Czy on jest Brytyjczykiem?"),
  q("she", "a teenager", "Czy ona jest nastolatką?"),
  q("they", "Polish", "Czy oni są Polakami?"),
  q("Don", "a superhero", "Czy Don jest superbohaterem?", "he"),
  q("your shoes", "new", "Czy twoje buty są nowe?", "they"),
  q("this jumper", "cool", "Czy ten sweter jest fajny?", "it"),
  q("Anna", "in the school band", "Czy Anna jest w zespole szkolnym?", "she"),
  q("I", "late", "Czy jestem spóźniony/spóźniona?"),
];

const cap = (s: string): string => (s === "" ? s : (s[0]?.toUpperCase() ?? "") + s.slice(1));

/** Podmiot w środku zdania: zaimki małą literą, „I" i imiona bez zmian. */
const inner = (subject: string): string =>
  ["you", "we", "he", "she", "it", "they"].includes(subject.toLowerCase()) ||
  /^(your|this|my)\b/i.test(subject)
    ? subject.toLowerCase()
    : subject;

export const statement = (it: Item): string => `${cap(it.subject)} ${it.verb} ${it.rest}.`;

export const question = (it: Item): string => `${cap(it.verb)} ${inner(it.subject)} ${it.rest}?`;

function negative(subject: string, verb: Be): string {
  if (verb === "am") return `${subject === "I" ? "I" : subject}'m not`;
  return `${subject} ${verb === "is" ? "isn't" : "aren't"}`;
}

export function shortAnswer(it: Item, yes: boolean): string {
  return yes ? `Yes, ${it.reply} ${it.replyVerb}.` : `No, ${negative(it.reply, it.replyVerb)}.`;
}

/** Forma „be" pasująca do zaimka — do pułapek ze złym podmiotem. */
const beFor = (subject: string): Be => (subject === "I" ? "am" : ["he", "she", "it"].includes(subject) ? "is" : "are");

/**
 * Cztery odpowiedzi: dobra, ta sama ze złym podmiotem (częsty błąd przy
 * „you" → „I"), odwrotna (tak/nie) i „tak" ze skrótem, którego się nie robi.
 */
export function answerChoices(it: Item, yes: boolean, rng: Rng): string[] {
  const right = shortAnswer(it, yes);
  const wrongWho = yes
    ? `Yes, ${it.trap} ${beFor(it.trap)}.`
    : `No, ${negative(it.trap, beFor(it.trap))}.`;
  const opposite = shortAnswer(it, !yes);
  const contracted =
    it.replyVerb === "am" ? "Yes, I'm." : `Yes, ${it.reply}'${it.replyVerb === "is" ? "s" : "re"}.`;
  const all = [right, wrongWho, opposite, contracted];
  return shuffle([...new Set(all)], rng);
}

/** Klocki do ułożenia pytania: czasownik, podmiot, reszta i zły czasownik na pułapkę. */
export type Tile = { readonly text: string; readonly role: "verb" | "subject" | "rest" | "decoy" };

export function tiles(it: Item, rng: Rng): Tile[] {
  const decoy: Be = it.verb === "is" ? "are" : "is";
  return shuffle(
    [
      { text: it.verb, role: "verb" },
      { text: inner(it.subject), role: "subject" },
      { text: it.rest, role: "rest" },
      { text: decoy, role: "decoy" },
    ],
    rng,
  );
}

/** Ułożone klocki są pytaniem, gdy idą: czasownik, podmiot, reszta. */
export const built = (order: readonly Tile[]): boolean =>
  order.length === 3 && order[0]?.role === "verb" && order[1]?.role === "subject" && order[2]?.role === "rest";

/** Ułożone klocki jako zdanie, z wielką literą i znakiem zapytania na końcu. */
export const sentenceOf = (order: readonly Tile[]): string =>
  order.length === 0 ? "" : cap(order.map((t) => t.text).join(" ")) + (order.length === 3 ? "?" : "");

/* ---------- „Kto to?" — tabelka z ćwiczenia 9 ---------- */

export type Trait = "teenager" | "superhero" | "British" | "Polish";

export const TRAITS: readonly { readonly id: Trait; readonly ask: string; readonly pl: string }[] = [
  { id: "teenager", ask: "Is he a teenager?", pl: "Czy jest nastolatkiem?" },
  { id: "superhero", ask: "Is he a superhero?", pl: "Czy jest superbohaterem?" },
  { id: "British", ask: "Is he British?", pl: "Czy jest Brytyjczykiem?" },
  { id: "Polish", ask: "Is he Polish?", pl: "Czy jest Polakiem?" },
];

export type Suspect = { readonly name: string; readonly face: string; readonly is: ReadonlySet<Trait> };

/** ✓ z tabelki w podręczniku. */
export const SUSPECTS: readonly Suspect[] = [
  { name: "Don", face: "🧑‍🦱", is: new Set<Trait>(["teenager", "superhero", "Polish"]) },
  { name: "Carl", face: "👨‍🦰", is: new Set<Trait>(["British"]) },
  { name: "Mark", face: "🧑‍🦳", is: new Set<Trait>(["teenager", "British"]) },
  { name: "Jim", face: "🧔", is: new Set<Trait>(["superhero", "Polish"]) },
];

export const reply = (s: Suspect, t: Trait): string => (s.is.has(t) ? "Yes, he is." : "No, he isn't.");

export type Asked = { readonly trait: Trait; readonly yes: boolean };

/** Czy ktoś wciąż pasuje do wszystkich odpowiedzi. */
export const fits = (s: Suspect, log: readonly Asked[]): boolean => log.every((a) => s.is.has(a.trait) === a.yes);

/** Gwiazdki za zgadnięcie: im mniej pytań, tym więcej. */
export const guessStars = (asked: number, right: boolean): 0 | 1 | 2 | 3 =>
  !right ? 0 : asked <= 2 ? 3 : asked === 3 ? 2 : 1;

/** Opis osoby jak w przykładzie z książki: „He isn't a teenager and he isn't British." */
export function describe(s: Suspect, a: Trait, b: Trait): string {
  const part = (t: Trait) => {
    const what = t === "teenager" || t === "superhero" ? `a ${t}` : t;
    return `he ${s.is.has(t) ? "is" : "isn't"} ${what}`;
  };
  return cap(`${part(a)} and ${part(b)}.`);
}
