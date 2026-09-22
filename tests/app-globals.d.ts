/* Powierzchnia obecnej aplikacji widziana z testów.
   Skrypt jest klasyczny (nie moduł), więc jego `let`/`const` żyją w zasięgu skryptu:
   w page.evaluate sięga się po nie gołą nazwą, nie przez globalThis. */
declare global {
  type AppReview = { e: number; i: number; d: number; r: number; l: number };
  type AppWord = { it: string; pr: string; pl: string; c: string; l: number; o: number };
  type AppSentence = { it: string; pl: string; gap: string; l: number };

  const DATA: { cats: string[]; words: AppWord[] };
  const SENT: AppSentence[];
  const EVIDENCE: Record<string, number>;

  let srs: Record<string, AppReview | undefined>;
  let days: Record<string, number | undefined>;
  let current: AppWord | null;
  let mode: string;
  let kind: "mix" | "cards" | "hard";
  let voiceOn: boolean;
  let qWord: AppWord;
  let sCur: AppSentence;
  let sDone: number;
  let settled: boolean;
  let sMode: string;

  function schedule(card: AppReview | null, grade: string, weight?: number): AppReview;
  function splitGap(sentence: string, gap: string): [string, string];
  function isLeech(word: AppWord): boolean;
  function canListen(): boolean;
  function exerciseFor(word: AppWord): string;
  function dayKey(): string;
  function renderQuizStep(direction: string): void;
  function renderListenStep(): void;
  function renderTypeStep(): void;
  function showView(view: string): void;
  function newQuestion(): void;

  interface Window { __spoken?: string[]; __DB?: { users: unknown[]; rows: unknown[] }; __UPSERTS?: number }
}
export {};
