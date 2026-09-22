/**
 * Port chmury. Domena zna tylko te operacje — nie wie nic o Supabase, tokenach
 * ani o tym, że pod spodem jest w ogóle HTTP.
 */

import type { Result, Username } from "../domain/types.js";

/** Wiersz postępu tak, jak leży w bazie: skrócony zapis, ten sam co w przeglądarce. */
export type RemoteRow = {
  readonly username: Username;
  readonly srs: unknown;
  readonly days: unknown;
  /** Ile słów utrwalonych — liczba na tablicę wyników. */
  readonly known: number;
};

export type Credentials = { readonly username: string; readonly password: string };

export type SyncBackend = {
  /** Kto jest zalogowany po powrocie na stronę; `null`, gdy nikt. */
  currentUser(): Promise<Username | null>;
  signIn(credentials: Credentials): Promise<Result<Username>>;
  signUp(credentials: Credentials): Promise<Result<Username>>;
  signOut(): Promise<void>;
  /** Własny wiersz — do scalenia z tym, co w przeglądarce. */
  loadOwn(): Promise<RemoteRow | null>;
  save(row: Omit<RemoteRow, "username">): Promise<Result<true>>;
  /** Wszystkie wiersze: tablica wyników i wspólny cel. */
  loadAll(): Promise<readonly RemoteRow[]>;
};
