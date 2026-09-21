# Włoski na co dzień

Aplikacja do nauki włoskiego dla osób mówiących po polsku: fiszki z powtórkami rozłożonymi
w czasie, quiz, układanie zdań i słownik. Statyczne pliki, bez backendu; konta i wspólna
tablica wyników działają na Supabase.

- `index.html` — interfejs i logika nauki
- `data.js` — słownictwo (725 słów) i zdania (116), podzielone na 3 poziomy
- `sync.js`, `config.js` — logowanie i synchronizacja
- `supabase.sql` — schemat bazy

## Jak działa nauka

Nie ma celu „przerób wszystko dziś". Każdego dnia dostajesz **10 nowych słów**
(do zmiany w interfejsie: 5–30) plus **powtórki, które wypadają na dziś**.

Po odsłonięciu tłumaczenia wybierasz jedną z trzech ocen, a odstęp do następnej powtórki
liczy się jak w SM-2 (silnik Anki w wersji minimalnej):

| Ocena | Co robi |
| --- | --- |
| Jeszcze nie | słowo wraca w tej samej sesji, odstęp zerowany, współczynnik łatwości w dół |
| Umiem | 1 dzień → 3 dni → poprzedni odstęp × łatwość |
| Łatwe | 4 dni → poprzedni odstęp × łatwość × 1,3 |

Słowo liczy się jako **utrwalone**, gdy jego odstęp sięgnie 21 dni.
Nowe słowa wchodzą w kolejności poziomów (`l` w `data.js`): najpierw podstawy,
potem rozszerzenie, na końcu zwroty konwersacyjne i gramatyka w praktyce.
Quiz i zdania trzymają się materiału, który już wprowadziłeś.

Zła odpowiedź w quizie cofa słowo do powtórki — tak samo jak „Jeszcze nie" na fiszce.

## Tablica wyników

Po zalogowaniu pod paskiem widać, **ile fiszek każdy zrobił dzisiaj**, serię dni pod rząd
i liczbę utrwalonych słów. Liczy się każda ocena na fiszce (także powtórki).

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
   Plik można uruchamiać ponownie po aktualizacjach — dokłada brakujące kolumny.
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
