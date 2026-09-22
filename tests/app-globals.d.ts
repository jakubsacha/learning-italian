/**
 * To, co testy podstawiają na `window`. Aplikacja tego nie czyta poza paczką
 * zbudowaną w trybie `test` — w produkcyjnej gałęzi tych odwołań nie ma.
 */
export {};

declare global {
  interface Window {
    /** Wypowiedzi zebrane przez atrapę syntezatora mowy. */
    __spoken?: string[];
    /** Atrapa bazy chmury. Jej brak znaczy „tryb lokalny". */
    __DB?: { users: unknown[]; rows: unknown[] };
    /** Wspólny cel dzienny podstawiony na czas testu. */
    __GOAL?: number;
  }
}
