/** Port zegara. Wstrzyknięty, żeby testy nie zależały od tego, która jest godzina. */

export type Clock = { now(): Date };

export const systemClock: Clock = { now: () => new Date() };

export const fixedClock = (date: Date): Clock => ({ now: () => date });
