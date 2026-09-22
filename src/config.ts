/**
 * Konfiguracja chmury. Klucz publikowalny jest publiczny z założenia — widać go
 * w źródle strony i może leżeć w repozytorium; dostępu do danych pilnuje RLS
 * z pliku `supabase.sql`. Bez wypełnionych wartości aplikacja działa lokalnie.
 */

export const SUPABASE_URL: string = "https://sgmcgvbfsqkwtwcdlqzr.supabase.co";
export const SUPABASE_KEY: string = "sb_publishable_GjH3-zOYTwb1CIEO9bKHyQ_vKcpEPq_";

/**
 * Nazwy zamieniamy na adres e-mail, bo Supabase tego wymaga. Na ten adres nic
 * nie jest wysyłane — potwierdzanie e-maila musi być wyłączone.
 */
export const EMAIL_DOMAIN: string = "learning-italian.app";

/**
 * Wspólny cel dzienny: ile fiszek łącznie ma zrobić cała dwójka. To nie wyścig
 * — liczy się suma, a wspólna seria łamie się, gdy któregoś dnia jej nie ma.
 */
export const DAILY_GOAL = 40;

export const cloudConfigured = (): boolean =>
  SUPABASE_URL.startsWith("https://") && SUPABASE_KEY !== "";
