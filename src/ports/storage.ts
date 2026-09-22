/**
 * Port trwałego zapisu. Domena nie wie, czy pod spodem jest `localStorage`,
 * pamięć czy plik — zna tylko te trzy operacje.
 */

export type KeyValueStore = {
  /** Odczyt zawsze zwraca `unknown`; dekodowanie należy do warstwy `storage`. */
  read(key: string): unknown;
  write(key: string, value: unknown): void;
  remove(key: string): void;
};
