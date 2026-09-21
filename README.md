# Włoski na co dzień

Aplikacja do nauki włoskiego dla osób mówiących po polsku: fiszki z powtórkami rozłożonymi
w czasie, quiz, układanie zdań i słownik. Statyczne pliki, bez backendu; konta i wspólna
tablica wyników działają na Supabase.

- `index.html` — interfejs i logika nauki
- `data.js` — słownictwo (725 słów) i zdania (116), podzielone na 3 poziomy
- `sync.js`, `config.js` — logowanie i synchronizacja
- `supabase.sql` — schemat bazy

## Jak działa nauka

Zakładka **Nauka** to jedna sesja dziennie, w której ćwiczenia się przeplatają
(*interleaving* — przypominanie w różnych formach utrwala lepiej niż jedna forma w kółko).
Typ ćwiczenia zależy od tego, jak dobrze znasz dane słowo:

| Stan słowa | Co możesz dostać |
| --- | --- |
| nowe | zawsze fiszka — najpierw trzeba je zobaczyć |
| 1–2 powtórki | fiszka albo quiz włoski → polski (rozpoznawanie) |
| 3+ powtórki | dochodzi quiz polski → włoski (produkcja) |
| 3+ powtórki i jest pasujące zdanie | dochodzi uzupełnianie luki w zdaniu |

Każda forma karmi ten sam harmonogram: dobra odpowiedź to „Umiem", zła to „Jeszcze nie".
Mieszanie można wyłączyć w Ustawieniach (zostaną same fiszki).
Zakładki Quiz i Zdania działają dalej jako swobodne ćwiczenie, bez wpływu na terminy.

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

## Wspólny cel i tablica

Po zalogowaniu na górze jest **wspólny cel dzienny**: suma kart zrobionych przez wszystkich
(domyślnie 40, zmienisz w `config.js` przez `window.DAILY_GOAL`). Pasek pokazuje, ile brakuje,
a **wspólna seria** liczy dni pod rząd, w których cel został wyrobiony razem — łamie się,
gdy któregoś dnia nie wyjdzie. Pod spodem widać wkład każdej osoby.

To celowo nie jest wyścig: przy dwóch osobach o różnym tempie ranking zniechęca tę wolniejszą,
a wspólny cel ustawia oboje po tej samej stronie.

## Sterowanie i wymowa

- **spacja** — pokaż tłumaczenie, potem „Umiem"; w quizie przechodzi dalej
- **1 / 2 / 3** — oceny na fiszce; w quizie **1–4** wybierają odpowiedź
- **S** — przeczytaj słowo na głos (`speechSynthesis`, głos `it-IT`)

Automatyczne czytanie nowych słów można wyłączyć w Ustawieniach. Jakość głosu zależy od
systemu — na iOS i macOS włoski jest dobry, na Linuksie bywa, że nie ma go wcale.

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
