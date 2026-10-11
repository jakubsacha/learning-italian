/**
 * Kto z kim w latach 1939–1941 — tylko to, co mówi książka: tekst rozdziału,
 * mapa „Ekspansja Hitlera i Stalina" (s. 18) i wkładka (s. 20–21). Państwa,
 * których strony nie da się ustalić z tych stron, tu nie ma.
 */

export type Side = "alianci" | "os" | "neutralne";

export const SIDES: readonly Side[] = ["alianci", "os", "neutralne"];

export const SIDE_LABEL: Readonly<Record<Side, string>> = {
  alianci: "Alianci",
  os: "Oś i jej sojusznicy",
  neutralne: "Neutralne",
};

export type Country = {
  readonly name: string;
  readonly side: Side;
  /** Dlaczego tu — słowami książki. */
  readonly why: string;
  readonly page: number;
};

const c = (name: string, side: Side, why: string, page: number): Country => ({ name, side, why, page });

export const COUNTRIES: readonly Country[] = [
  // --- Oś ---
  c("Niemcy (III Rzesza)", "os", "Rozpoczęły wojnę atakiem na Polskę 1 września 1939 r.", 9),
  c("Włochy", "os", "Rządzone przez Benita Mussoliniego; 10 czerwca 1940 r. przyłączyły się do wojny po stronie III Rzeszy.", 16),
  c("Węgry", "os", "Sojusznik III Rzeszy na Bałkanach — Niemcy zawarli z nimi porozumienie.", 19),
  c("Rumunia", "os", "Sojusznik III Rzeszy na Bałkanach — Niemcy zawarli z nią porozumienie.", 19),
  c("Bułgaria", "os", "Sojusznik III Rzeszy na Bałkanach — Niemcy zawarli z nią porozumienie.", 19),
  c("Państwo Vichy", "os", "Marionetkowe państwo francuskie — jego władze kolaborowały z Niemcami.", 17),
  c("Niepodległe Państwo Chorwackie", "os", "Marionetkowe państwo utworzone pod kontrolą Niemiec.", 19),
  // --- alianci ---
  c("Polska", "alianci", "Pierwsza zaatakowana przez Niemcy; sojusznik Wielkiej Brytanii i Francji.", 8),
  c("Wielka Brytania", "alianci", "3 września 1939 r. wypowiedziała wojnę Niemcom; po klęsce Francji walczyła sama.", 9),
  c("Francja", "alianci", "3 września 1939 r. wypowiedziała wojnę Niemcom; 22 czerwca 1940 r. podpisała zawieszenie broni.", 9),
  c("Norwegia", "alianci", "Stawiła opór Niemcom, wsparta przez oddziały brytyjskie, francuskie i polskie.", 16),
  c("Holandia", "alianci", "Zaatakowana przez Niemcy w maju 1940 r.; na mapie wśród państw sprzymierzonych.", 16),
  c("Belgia", "alianci", "Zaatakowana przez Niemcy w maju 1940 r.; na mapie wśród państw sprzymierzonych.", 16),
  c("Grecja", "alianci", "Obroniła się przed Włochami; w kwietniu 1941 r. zaatakowana przez Niemcy, wspierana przez Brytyjczyków.", 19),
  c("Jugosławia", "alianci", "Jako jedyna na Bałkanach odrzuciła sojusz z Niemcami; zaatakowana w kwietniu 1941 r.", 19),
  c("Kanada", "alianci", "Dominium wspierające Wielką Brytanię.", 17),
  c("Australia", "alianci", "Dominium wspierające Wielką Brytanię.", 17),
  c("Indie", "alianci", "Kolonia wspierająca Wielką Brytanię.", 17),
  c("Nowa Zelandia", "alianci", "Jej lotnicy walczyli w bitwie o Anglię jako lotnicy państw sprzymierzonych.", 21),
  c("RPA", "alianci", "Jej lotnicy walczyli w bitwie o Anglię jako lotnicy państw sprzymierzonych.", 21),
  c("Czechosłowacja", "alianci", "Jej lotnicy walczyli w bitwie o Anglię jako lotnicy państw sprzymierzonych.", 21),
  // --- neutralne (mapa s. 18) ---
  c("Szwecja", "neutralne", "Na mapie wśród państw neutralnych.", 18),
  c("Szwajcaria", "neutralne", "Na mapie wśród państw neutralnych.", 18),
  c("Hiszpania", "neutralne", "Na mapie wśród państw neutralnych.", 18),
  c("Portugalia", "neutralne", "Na mapie wśród państw neutralnych.", 18),
  c("Irlandia", "neutralne", "Na mapie wśród państw neutralnych.", 18),
  c("Turcja", "neutralne", "Na mapie wśród państw neutralnych.", 18),
];

/**
 * ZSRS nie pasuje do żadnej z trzech grup i książka mówi to wprost — dlatego
 * nie jest pytaniem, tylko osobną notką pod grą.
 */
export const USSR_NOTE =
  "ZSRS nie należał do żadnej z tych grup. W latach 1939–1941 ściśle współpracował z hitlerowskimi " +
  "Niemcami: 17 września 1939 r. napadł na Polskę, potem zaatakował Finlandię i zajął Litwę, Łotwę, " +
  "Estonię oraz Besarabię (s. 12, 15).";
