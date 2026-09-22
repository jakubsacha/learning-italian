/** Port wymowy. Bez głosu aplikacja działa dalej, tylko bez ćwiczeń ze słuchu. */

export type Speech = {
  /** Czy da się odtworzyć włoski — od tego zależy, czy istnieje forma „ze słuchu". */
  readonly available: boolean;
  say(text: string): void;
  /** Wywoływane, gdy przeglądarka dosypie głosy już po starcie. */
  onChange(listener: () => void): void;
};
