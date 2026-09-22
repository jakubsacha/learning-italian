/**
 * Atrapa chmury na potrzeby testów end-to-end. Cała „baza" siedzi w
 * `window.__DB`, dzięki czemu testy nie dotykają sieci ani prawdziwego projektu.
 * Do produkcyjnej paczki nie trafia: wchodzi tylko w gałęzi `MODE === "test"`,
 * którą Vite wycina przy zwykłym budowaniu.
 */

import type { Credentials, RemoteRow, SyncBackend } from "../ports/sync.js";
import { err, ok, type Username } from "../domain/types.js";
import { validate } from "./supabase-sync.js";

type FakeUser = {
  id: string;
  email: string;
  password: string;
  user_metadata: { username: string };
};
type FakeRow = { user_id: string; username: string; srs: unknown; days: unknown; known: number };
export type FakeDb = { users: FakeUser[]; rows: FakeRow[] };

declare global {
  interface Window {
    __DB?: FakeDb;
    __GOAL?: number;
  }
}

const DOMAIN = "learning-italian.app";

export function fakeSync(): SyncBackend | null {
  const db = window.__DB;
  if (db === undefined) return null;
  let user: FakeUser | null = null;

  const row = (r: FakeRow): RemoteRow => ({
    username: r.username as Username,
    srs: r.srs,
    days: r.days,
    known: r.known,
  });

  return {
    async currentUser() {
      return user === null ? null : (user.user_metadata.username as Username);
    },

    async signIn(credentials: Credentials) {
      const checked = validate(credentials);
      if (!checked.ok) return checked;
      const email = checked.value.username + "@" + DOMAIN;
      const found = db.users.find(
        (u) => u.email === email && u.password === checked.value.password,
      );
      if (found === undefined) return err("Zła nazwa lub hasło.");
      user = found;
      return ok(found.user_metadata.username as Username);
    },

    async signUp(credentials: Credentials) {
      const checked = validate(credentials);
      if (!checked.ok) return checked;
      const { username, password } = checked.value;
      const email = username + "@" + DOMAIN;
      if (db.users.some((u) => u.email === email)) {
        return err("Nazwa „" + username + "” jest już zajęta.");
      }
      const fresh: FakeUser = {
        id: "id-" + email,
        email,
        password,
        user_metadata: { username },
      };
      db.users.push(fresh);
      user = fresh;
      return ok(username as Username);
    },

    async signOut() {
      user = null;
    },

    async loadOwn() {
      if (user === null) return null;
      const found = db.rows.find((r) => r.user_id === user?.id);
      return found === undefined ? null : row(found);
    },

    async save(payload) {
      if (user === null) return err("Nie jesteś zalogowany.");
      const next: FakeRow = {
        user_id: user.id,
        username: user.user_metadata.username,
        srs: payload.srs,
        days: payload.days,
        known: payload.known,
      };
      const at = db.rows.findIndex((r) => r.user_id === next.user_id);
      if (at >= 0) db.rows[at] = next;
      else db.rows.push(next);
      return ok(true as const);
    },

    async loadAll() {
      return db.rows.map(row);
    },
  };
}
