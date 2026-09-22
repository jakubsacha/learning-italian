/* Atrapa @supabase/supabase-js na potrzeby testów: cała baza siedzi w globalThis.__DB,
   dzięki czemu testy nie dotykają sieci ani prawdziwego projektu. */
export function createClient() {
  const db = globalThis.__DB;
  let session = null;
  const table = () => ({
    _eq: null,
    select() { return this; },
    eq(col, val) { this._eq = [col, val]; return this; },
    order() { return this; },
    async maybeSingle() {
      const row = db.rows.find((r) => r[this._eq[0]] === this._eq[1]);
      return { data: row ?? null, error: null };
    },
    then(resolve) {
      return Promise.resolve({ data: db.rows.map((r) => ({ ...r })), error: null }).then(resolve);
    },
    async upsert(row) {
      const i = db.rows.findIndex((r) => r.user_id === row.user_id);
      if (i >= 0) db.rows[i] = row; else db.rows.push(row);
      globalThis.__UPSERTS = (globalThis.__UPSERTS ?? 0) + 1;
      return { error: null };
    },
  });
  return {
    from: table,
    auth: {
      async getSession() { return { data: { session } }; },
      async signInWithPassword({ email, password }) {
        const user = db.users.find((u) => u.email === email && u.password === password);
        if (!user) return { data: {}, error: { message: "Invalid login credentials" } };
        session = { user };
        return { data: { user }, error: null };
      },
      async signUp({ email, password, options }) {
        if (db.users.some((u) => u.email === email))
          return { data: {}, error: { message: "User already registered" } };
        const user = { id: "id-" + email, email, password, user_metadata: options.data };
        db.users.push(user);
        session = { user };
        return { data: { user, session }, error: null };
      },
      async signOut() { session = null; return {}; },
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
    },
  };
}
