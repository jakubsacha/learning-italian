/* Konfiguracja Supabase.
   Supabase → Project Settings → API Keys → Publishable key (sb_publishable_...).
   Ten klucz jest publiczny z założenia — jest widoczny w źródle strony i może
   leżeć w repo; dostępu do danych pilnuje RLS z pliku supabase.sql.
   Bez wypełnionych wartości aplikacja działa w trybie lokalnym (jak wcześniej). */
window.SUPABASE_URL      = "https://sgmcgvbfsqkwtwcdlqzr.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_GjH3-zOYTwb1CIEO9bKHyQ_vKcpEPq_";

/* Wspólny cel dzienny: ile fiszek łącznie ma zrobić cała dwójka.
   Nie jest to wyścig — liczy się suma, a wspólna seria łamie się,
   gdy któregoś dnia razem nie wyrobicie celu. */
window.DAILY_GOAL = 40;

/* Nazwy użytkownika zamieniamy na adres e-mail (Supabase tego wymaga).
   Na ten adres nic nie jest wysyłane — potwierdzanie e-maila musi być wyłączone. */
window.SUPABASE_EMAIL_DOMAIN = "learning-italian.app";
