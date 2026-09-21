# Włoski — 250 słów

Jednoplikowa aplikacja do nauki włoskiego (fiszki, quiz, układanie zdań) dla osób mówiących po polsku.
Całość to statyczny `index.html` — bez backendu, bez zależności. Postęp zapisuje się w `localStorage` przeglądarki.

## Live

https://jakubsacha.github.io/learning-italian/

## Deploy

Publikacja odbywa się automatycznie przez GitHub Actions (`.github/workflows/pages.yml`)
przy każdym pushu na `main`.

Jednorazowo, zanim pierwszy deploy się powiedzie:
**Settings → Pages → Build and deployment → Source: GitHub Actions**.
Tego kroku nie da się zrobić z poziomu workflow — `configure-pages` z
`enablement: true` dostaje z API `Resource not accessible by integration`,
bo `GITHUB_TOKEN` nie ma prawa tworzyć witryny Pages.

## Konta i synchronizacja (Supabase)

Logowanie samą nazwą i hasłem — bez e-maila, bez potwierdzania. Nazwa jest zajmowana
na stałe: gdy „monika” już istnieje, nikt inny jej nie założy. Po zalogowaniu postęp
fiszek trafia do chmury, a pod paskiem widać tablicę z wynikami wszystkich osób.

Konfiguracja raz, w Supabase:

1. Utwórz darmowy projekt na https://supabase.com.
2. **SQL Editor** → wklej i uruchom całe `supabase.sql` (tabela `progress` + RLS).
3. **Authentication → Sign In / Providers → Email**: włącz, a **wyłącz „Confirm email”**.
   Bez tego rejestracja utknie na potwierdzeniu, którego nikt nie odbierze.
4. **Project Settings → API Keys**: skopiuj `Project URL` i **Publishable key**
   (`sb_publishable_...`) do `config.js`. Ten klucz jest publiczny z założenia — trafia
   do źródła strony i może leżeć w repo, bo dostępu do danych pilnuje RLS.
   Starszy klucz `anon` też zadziała, ale Supabase oznacza go już jako legacy.

Jak to działa pod spodem: nazwa jest zamieniana na adres `nazwa@learning-italian.app`
(domena z `config.js`), bo Supabase Auth wymaga e-maila. Na ten adres nic nie leci.

Zasady scalania postępu przy logowaniu:

- pierwsze logowanie danym kontem — postęp z przeglądarki jedzie do chmury;
- ta sama osoba na swoim urządzeniu — stan lokalny i zdalny scalają się (wyższy poziom wygrywa);
- inna osoba w tej przeglądarce — obowiązuje stan z serwera, żeby nie przejąć cudzych wyników.

Bez wypełnionego `config.js` aplikacja działa dokładnie jak wcześniej: lokalnie,
bez logowania.

## Lokalnie

```sh
python3 -m http.server 8000   # http://localhost:8000
```
