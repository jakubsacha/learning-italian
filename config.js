/* Konfiguracja Supabase.
   Supabase → Project Settings → API → Project URL oraz anon/public key.
   Klucz "anon" jest publiczny z założenia — może być w repo.
   Dopóki tu są placeholdery, aplikacja działa w trybie lokalnym (jak wcześniej). */
window.SUPABASE_URL      = "WKLEJ_PROJECT_URL";
window.SUPABASE_ANON_KEY = "WKLEJ_ANON_KEY";

/* Nazwy użytkownika zamieniamy na adres e-mail (Supabase tego wymaga).
   Na ten adres nic nie jest wysyłane — potwierdzanie e-maila musi być wyłączone. */
window.SUPABASE_EMAIL_DOMAIN = "learning-italian.app";
