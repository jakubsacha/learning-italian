/* Logowanie nazwą użytkownika + synchronizacja postępu przez Supabase.
   Bez konfiguracji (config.js z placeholderami) aplikacja działa jak wcześniej,
   czyli lokalnie — ten moduł tylko pokazuje wtedy "tryb lokalny". */

const $ = s => document.querySelector(s);
const who = $("#sync-who"), board = $("#board");
const btnLogin = $("#sync-login"), btnLogout = $("#sync-logout");
const dlg = $("#auth-dlg"), errBox = $("#auth-err");

const URL_ = window.SUPABASE_URL, KEY = window.SUPABASE_ANON_KEY;
const DOMAIN = window.SUPABASE_EMAIL_DOMAIN || "learning-italian.app";
const configured = URL_ && KEY && !/^WKLEJ_/.test(URL_) && !/^WKLEJ_/.test(KEY);

function status(html, cls){
  who.innerHTML = '<span class="dot ' + (cls || "") + '"></span>' + html;
}

if(!configured){
  status("Tryb lokalny — uzupełnij <code>config.js</code>, żeby włączyć konta");
  btnLogin.hidden = true;
} else {
  init();
}

async function init(){
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  const sb = createClient(URL_, KEY);

  let user = null, username = null, pushTimer = null;

  const mail = u => u + "@" + DOMAIN;
  const nick = u => (u.user_metadata && u.user_metadata.username) || u.email.split("@")[0];
  const cleanNick = v => (v || "").trim().toLowerCase();

  /* --- łączenie postępów -------------------------------------------- */
  // Maksimum z obu stron: nauka na dwóch urządzeniach nic nie gubi.
  const mergeMax = (a, b) => {
    const out = Object.assign({}, a || {});
    for(const [k, v] of Object.entries(b || {})) out[k] = Math.max(out[k] || 0, v || 0);
    return out;
  };

  /* --- zapis ---------------------------------------------------------- */
  async function flush(){
    if(!user) return;
    clearTimeout(pushTimer); pushTimer = null;
    const { error } = await sb.from("progress").upsert({
      user_id: user.id,
      username,
      box: window.ITApp.getBox(),
      known: window.ITApp.known(),
      updated_at: new Date().toISOString()
    });
    if(error){ status("Zalogowano jako <b>" + username + "</b> — błąd zapisu", "err"); return; }
    signedInLabel();
    renderBoard();
  }
  // Wywoływane z index.html przy każdej zmianie postępu.
  window.Sync = { push(){ if(user){ clearTimeout(pushTimer); pushTimer = setTimeout(flush, 1200); } } };
  addEventListener("visibilitychange", () => { if(document.hidden && pushTimer) flush(); });

  /* --- tablica wyników ------------------------------------------------ */
  function ago(iso){
    const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
    return d <= 0 ? "dziś" : d === 1 ? "wczoraj" : d + " dni temu";
  }
  async function renderBoard(){
    const { data, error } = await sb.from("progress")
      .select("username,known,updated_at").order("known", { ascending: false });
    if(error || !data){ board.classList.remove("show"); return; }
    board.innerHTML = "";
    const total = window.ITApp.total;
    data.forEach(r => {
      const row = document.createElement("div");
      row.className = "board-row" + (r.username === username ? " me" : "");
      const n = document.createElement("span"); n.className = "nick"; n.textContent = r.username;
      const t = document.createElement("span"); t.className = "track";
      const i = document.createElement("i"); i.style.width = Math.round((r.known / total) * 100) + "%";
      t.appendChild(i);
      const num = document.createElement("span"); num.className = "num";
      num.textContent = r.known + "/" + total + " · " + ago(r.updated_at);
      row.append(n, t, num);
      board.appendChild(row);
    });
    board.classList.add("show");
  }

  /* --- wejście / wyjście ---------------------------------------------- */
  function signedInLabel(){
    status("Zalogowano jako <b>" + username + "</b> — postęp zapisany w chmurze", "on");
  }

  async function onSignedIn(u){
    user = u; username = nick(u);
    btnLogin.hidden = true; btnLogout.hidden = false;
    signedInLabel();

    const { data: row } = await sb.from("progress")
      .select("box").eq("user_id", user.id).maybeSingle();
    const local = window.ITApp.getBox();
    const lastOwner = localStorage.getItem("it250.owner");

    if(!row){
      // Pierwsze logowanie: zabieramy ze sobą to, co już jest w przeglądarce.
      await flush();
    } else if(lastOwner === username){
      // To samo urządzenie, ta sama osoba — scalamy, nic nie ginie.
      window.ITApp.setBox(mergeMax(row.box, local));
      await flush();
    } else {
      // Cudza (albo świeża) przeglądarka — obowiązuje stan z serwera.
      window.ITApp.setBox(row.box || {});
    }
    localStorage.setItem("it250.owner", username);
    renderBoard();
  }

  function onSignedOut(){
    user = null; username = null;
    btnLogin.hidden = false; btnLogout.hidden = true;
    board.classList.remove("show");
    status("Tryb lokalny — postęp tylko w tej przeglądarce");
  }

  const { data: { session } } = await sb.auth.getSession();
  if(session) await onSignedIn(session.user); else onSignedOut();

  /* --- okienko logowania ---------------------------------------------- */
  const fail = m => { errBox.textContent = m; errBox.classList.add("show"); };
  const busy = b => dlg.querySelectorAll("button").forEach(x => x.disabled = b);

  btnLogin.onclick = () => { errBox.classList.remove("show"); dlg.showModal(); $("#auth-user").focus(); };
  $("#auth-cancel").onclick = () => dlg.close();
  btnLogout.onclick = async () => { if(pushTimer) await flush(); await sb.auth.signOut(); onSignedOut(); };

  function creds(){
    const u = cleanNick($("#auth-user").value), p = $("#auth-pass").value;
    if(!/^[a-z0-9_-]{2,20}$/.test(u)){ fail("Nazwa: 2–20 znaków, tylko litery bez polskich znaków, cyfry, - i _."); return null; }
    if(p.length < 6){ fail("Hasło musi mieć co najmniej 6 znaków."); return null; }
    return { u, p };
  }

  async function doSignIn(){
    errBox.classList.remove("show");
    const c = creds(); if(!c) return;
    busy(true);
    const { data, error } = await sb.auth.signInWithPassword({ email: mail(c.u), password: c.p });
    busy(false);
    if(error){ fail("Zła nazwa lub hasło."); return; }
    dlg.close(); await onSignedIn(data.user);
  }

  async function doSignUp(){
    errBox.classList.remove("show");
    const c = creds(); if(!c) return;
    busy(true);
    const { data, error } = await sb.auth.signUp({
      email: mail(c.u), password: c.p, options: { data: { username: c.u } }
    });
    busy(false);
    if(error){
      fail(/registered|exists/i.test(error.message)
        ? "Nazwa „" + c.u + "” jest już zajęta."
        : "Nie udało się założyć konta: " + error.message);
      return;
    }
    if(!data.session){
      fail("Konto założone, ale Supabase wymaga potwierdzenia e-maila — wyłącz „Confirm email”.");
      return;
    }
    dlg.close(); await onSignedIn(data.user);
  }

  $("#auth-form").onsubmit = e => { e.preventDefault(); doSignIn(); };
  $("#auth-signup").onclick = doSignUp;

  sb.auth.onAuthStateChange((ev) => { if(ev === "SIGNED_OUT") onSignedOut(); });
}
