/**
 * Chmura na Supabase. Konto zakłada się samą nazwą — Supabase wymaga adresu
 * e-mail, więc doklejamy stałą domenę i nic na nią nie wysyłamy.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { EMAIL_DOMAIN, SUPABASE_KEY, SUPABASE_URL } from "../config.js";
import type { Credentials, RemoteRow, SyncBackend } from "../ports/sync.js";
import { err, ok, type Result, type Username } from "../domain/types.js";
import { asFiniteNumber, asText, isRecord } from "../storage/codec.js";

const HANDLE = /^[a-z0-9_-]{2,20}$/;
const MIN_PASSWORD = 6;

const mail = (username: string): string => username + "@" + EMAIL_DOMAIN;

const nickOf = (user: User): Username => {
  const meta = user.user_metadata as Record<string, unknown>;
  return (asText(meta["username"]) ?? (user.email ?? "").split("@")[0] ?? "") as Username;
};

/** Sprawdzenie po stronie przeglądarki — komunikat po polsku zamiast błędu z API. */
export function validate(credentials: Credentials): Result<Credentials> {
  const username = credentials.username.trim().toLowerCase();
  if (!HANDLE.test(username)) {
    return err("Nazwa: 2–20 znaków, tylko litery bez polskich znaków, cyfry, - i _.");
  }
  if (credentials.password.length < MIN_PASSWORD) {
    return err("Hasło musi mieć co najmniej " + MIN_PASSWORD + " znaków.");
  }
  return ok({ username, password: credentials.password });
}

function decodeRow(value: unknown): RemoteRow | null {
  if (!isRecord(value)) return null;
  const username = asText(value["username"]);
  if (username === null) return null;
  return {
    username: username as Username,
    srs: value["srs"],
    days: value["days"],
    known: asFiniteNumber(value["known"]) ?? 0,
  };
}

export async function supabaseSync(): Promise<SyncBackend> {
  // Klient ładuje się osobną paczką — bez logowania nikt go nie pobiera.
  const { createClient } = await import("@supabase/supabase-js");
  const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  let user: User | null = null;

  const enter = (signed: User): Username => {
    user = signed;
    return nickOf(signed);
  };

  return {
    async currentUser() {
      const { data } = await sb.auth.getSession();
      return data.session === null ? null : enter(data.session.user);
    },

    async signIn(credentials) {
      const checked = validate(credentials);
      if (!checked.ok) return checked;
      const { data, error } = await sb.auth.signInWithPassword({
        email: mail(checked.value.username),
        password: checked.value.password,
      });
      if (error !== null || data.user === null) return err("Zła nazwa lub hasło.");
      return ok(enter(data.user));
    },

    async signUp(credentials) {
      const checked = validate(credentials);
      if (!checked.ok) return checked;
      const { username, password } = checked.value;
      const { data, error } = await sb.auth.signUp({
        email: mail(username),
        password,
        options: { data: { username } },
      });
      if (error !== null) {
        return err(
          /registered|exists/i.test(error.message)
            ? "Nazwa „" + username + "” jest już zajęta."
            : "Nie udało się założyć konta: " + error.message,
        );
      }
      if (data.session === null) {
        return err("Konto założone, ale Supabase wymaga potwierdzenia e-maila — wyłącz „Confirm email”.");
      }
      if (data.user === null) return err("Nie udało się założyć konta.");
      return ok(enter(data.user));
    },

    async signOut() {
      await sb.auth.signOut();
      user = null;
    },

    async loadOwn() {
      if (user === null) return null;
      const { data } = await sb
        .from("progress")
        .select("username,srs,days,known")
        .eq("user_id", user.id)
        .maybeSingle();
      return decodeRow(data);
    },

    async save(row) {
      if (user === null) return err("Nie jesteś zalogowany.");
      const { error } = await sb.from("progress").upsert({
        user_id: user.id,
        username: nickOf(user),
        srs: row.srs,
        days: row.days,
        known: row.known,
        updated_at: new Date().toISOString(),
      });
      return error === null ? ok(true as const) : err("Błąd zapisu w chmurze.");
    },

    async loadAll() {
      const { data } = await sb.from("progress").select("username,srs,days,known");
      if (data === null) return [];
      return data.map(decodeRow).filter((row): row is RemoteRow => row !== null);
    },
  };
}
