# Włoski na co dzień

Aplikacja do nauki włoskiego dla osób mówiących po polsku: fiszki z powtórkami rozłożonymi
w czasie, quiz, układanie zdań i słownik. Statyczne pliki, bez backendu; konta i wspólna
tablica wyników działają na Supabase.

- `index.html` — interfejs i logika nauki
- `data.js` — słownictwo (1914 haseł) i zdania (186)
- `sync.js`, `config.js` — logowanie i synchronizacja
- `supabase.sql` — schemat bazy

## Jak działa nauka

Trzy zakładki prowadzą naukę:

- **Nauka** — dzienna kolejka, ćwiczenia się przeplatają (fiszka, quiz, pisanie, słuch, luka)
- **Fiszki** — ta sama dzienna kolejka, ale wyłącznie klasyczne karty
- **Trudne** — trening na żądanie: same słowa, na których się wykładasz

Nauka i Fiszki dzielą kolejkę — karta zrobiona w jednym trybie znika w drugim.
Trudne to osobna lista (do 20 słów, od największej liczby wpadek), niezależna od terminów
powtórek; wyniki liczą się normalnie do harmonogramu i do dziennego licznika.
Przy zakładce widać, ile takich słów masz. Wybór zakładki zapamiętuje się między wizytami.

Zakładka **Nauka** to jedna sesja dziennie, w której ćwiczenia się przeplatają
(*interleaving* — przypominanie w różnych formach utrwala lepiej niż jedna forma w kółko).
Typ ćwiczenia zależy od tego, jak dobrze znasz dane słowo:

| Stan słowa | Co możesz dostać |
| --- | --- |
| nowe | zawsze fiszka — najpierw trzeba je zobaczyć |
| 1+ powtórka | fiszka, quiz włoski → polski, ze słuchu (bez tekstu) |
| 2+ powtórki | dochodzi quiz polski → włoski |
| 3+ powtórki | dochodzi **wpisywanie z głowy** i uzupełnianie luki w zdaniu |
| słowo, na którym się wykładasz | wraca do łatwych form: fiszka, rozpoznawanie, słuch |

Trafienie w trudniejszej formie to mocniejszy dowód, więc **wpisanie z pamięci liczy się
jak ocena „Łatwe"** i odstęp rośnie szybciej. Literówka (1–2 znaki) jest wybaczana —
liczy się jak „Umiem", a nie jak błąd. Ćwiczenie ze słuchu włącza się tylko wtedy,
gdy przeglądarka ma zainstalowany włoski głos.

### Słowa, które sprawiają kłopot

Po trzeciej wpadce słowo dostaje etykietę „trudne": wraca **częściej niż wynika
z terminu** (do 5 takich na sesję), dostaje tylko łatwiejsze formy ćwiczeń,
a na koniec dnia widzisz listę tych, na których wykładasz się najczęściej.
Linijka pod paskiem postępu rozbija kolejkę na powtórki, trudne i nowe słowa,
więc widać, skąd się wzięła każda karta.

Lista słów pokazanych danego dnia jest zapisywana, więc dociągnięte trudne słowa
nie wracają po odświeżeniu strony.

Każda forma karmi ten sam harmonogram: dobra odpowiedź to „Umiem", zła to „Jeszcze nie".
Mieszanie można wyłączyć w Ustawieniach (zostaną same fiszki).
Zakładki Quiz i Zdania działają dalej jako swobodne ćwiczenie, bez wpływu na terminy.

Nie ma celu „przerób wszystko dziś". Każdego dnia dostajesz **10 nowych słów**
(do zmiany w interfejsie: 5–30) plus **powtórki, które wypadają na dziś**.

Po odsłonięciu tłumaczenia wybierasz jedną z czterech ocen — klawisze **1–4**:

| Ocena | Klawisz | Co robi |
| --- | --- | --- |
| Nie wiem | 1 | wraca w tej samej sesji, odstęp zerowany, łatwość −0,2, liczy się wpadka |
| Słabo | 2 | 1 dzień → poprzedni odstęp × 1,2; łatwość −0,15 |
| Dobrze | 3 | 2 dni → 3 dni → poprzedni odstęp × łatwość |
| Łatwo | 4 | 4 dni → poprzedni odstęp × łatwość × 1,3; łatwość +0,15 |

Odstęp jest ograniczony do roku.

### Waga dowodu: nie każde trafienie znaczy tyle samo

Poprawna odpowiedź w teście wyboru to słabszy dowód niż przypomnienie sobie słowa
z pustej głowy — jedno na cztery można trafić przypadkiem. Dlatego wynik ćwiczenia
przemnaża odstęp przez wagę formy:

| Forma | Waga | Dlaczego |
| --- | --- | --- |
| wpisywanie | ×1,20 | produkcja bez podpowiedzi, nie da się zgadnąć |
| fiszka | ×1,00 | przypomnienie, ale ocenione przez Ciebie samego |
| quiz PL→IT, luka | ×0,95 | produkcja, ale rozpoznawana z listy |
| ze słuchu | ×0,90 | rozpoznanie + dodatkowa trudność odbioru |
| quiz IT→PL | ×0,85 | najłatwiejsza forma, 25% szans na traf |

W praktyce słowo klikane w quizie i to samo słowo wpisywane z pamięci rozjeżdżają się
z każdą powtórką: 2 → 4 → 9 → 19 → 40 dni przy quizie, 2 → 6 → 18 → 54 → 162 przy pisaniu.

Słowo liczy się jako **utrwalone**, gdy jego odstęp sięgnie 21 dni.
Nowe słowa wchodzą **w kolejności częstotliwości w mówionym włoskim** (pole `o`
w `data.js`), policzonej z korpusu dialogów filmowych OpenSubtitles 2018
([hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords)).
Wyjątek: zwroty grzecznościowe idą przodem, bo czysta frekwencja zaczynałaby naukę
od `e`, `non`, `di` — słów częstych, ale bezużytecznych jako pierwsze fiszki.
Zwrot wielowyrazowy dziedziczy rangę swojego najrzadszego składnika.
Quiz i zdania trzymają się materiału, który już wprowadziłeś.

Zła odpowiedź w quizie cofa słowo do powtórki — tak samo jak „Jeszcze nie" na fiszce.

## Materiał

1914 haseł, z czego **30% to zwroty wielowyrazowe** — bo płynność bierze się z gotowych
klocków (*secondo me*, *non vedo l'ora*, *il problema è che*), a nie ze składania zdań
słowo po słowie. Do tego 186 zdań do ćwiczenia luk.

Pokrycie 200 najczęstszych słów mówionego włoskiego: **90%** (wcześniej 67%).
Dla porównania, badania Nationa wskazują 2000–3000 rodzin wyrazów jako próg 95%
pokrycia zwykłej rozmowy — hasło w tej aplikacji to nie to samo co rodzina wyrazów,
więc do tego progu jeszcze trochę brakuje.

Uwaga: tłumaczenia i fonetyka są pisane bez weryfikacji native speakera.

## Zakładka Postęp

Statystyki liczone z lokalnego stanu powtórek:

- **kafelki** — utrwalone, poznane, seria dni
- **ile kursu za Tobą** — ile z 1914 haseł w ogóle ruszyłeś
- **podział poznanych** — utrwalone / młode / w nauce (pasek liczony wśród poznanych,
  bo na tle całego kursu 93% byłoby szare i nic by nie było widać)
- **aktywność** — 30 dni wstecz, **plan powtórek** — 14 dni w przód
- **kategorie** z największym pokryciem i **najtrudniejsze słowa** z liczbą wpadek

Progi stanów: w nauce < 7 dni odstępu, młode 7–20, utrwalone od 21 dni.

Trzy odcienie zieleni dobrane walidatorem z poradnika wizualizacji, nie na oko:
rozróżnialność ΔE 19,5 przy protanopii i 20,0 przy normalnym widzeniu (próg 15).
Każdy segment ma podpis z liczbą, więc kolor nigdy nie jest jedynym nośnikiem informacji.
Ciemny motyw ma własne kroki ramp, sprawdzone na ciemnym tle, a nie odwrócone mechanicznie.

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

Wymowa odzywa się też **po sprawdzeniu odpowiedzi** — w quizie, w uzupełnianiu luki
i po ułożeniu zdania (wtedy czytane jest całe zdanie). Ćwiczenie ze słuchu nie dubluje
odtworzenia. Automatyczne czytanie można wyłączyć w Ustawieniach.

Na ekranach dotykowych podpowiedzi klawiszy (cyfry przy ocenach i odpowiedziach,
„spacja" przy przyciskach) są ukrywane — tam i tak nie ma klawiatury. Jakość głosu zależy od
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

## Wygląd

Interfejs jest w stylu aplikacji do nauki języków: grube zaokrąglone przyciski
z efektem wciśnięcia (kolorowa krawędź u dołu znika przy kliknięciu), mocna
zaokrąglona typografia (Nunito z Google Fonts, z odwrotem do czcionki systemowej,
gdy nie da się jej pobrać), nasycona zieleń jako kolor akcji i niebieski jako
kolor zaznaczenia. Motyw jasny i ciemny idą za ustawieniem systemu, z ręcznym
przełącznikiem w nagłówku.

Zakładki układają się w siatkę 3×2 na telefonie i w jeden rząd od 600 px w górę.
Nauka jest na górze ekranu; konto, wspólny cel i tablica siedzą pod sesją, nad stopką —
widzisz je, gdy skończysz, a nie zanim zaczniesz.

## Testy

Zestaw testów Playwrighta opisuje zachowanie aplikacji: harmonogram powtórek, licznik
sesji, formy ćwiczeń, trudne słowa, statystyki, synchronizację i układ na wąskich
ekranach. Uruchamiają się na Chrome desktopowym i mobilnym (`Pixel 7`), bo tylko te
przeglądarki są wspierane.

```sh
npm ci
npx playwright install chromium
npm test
```

Serwer statyczny na czas testów bierze katalog z `APP_DIR` (domyślnie katalog główny),
więc po ewentualnym przejściu na build wystarczy wskazać `dist` — testy zostają te same.
Testy chodzą też w CI przy każdym pull requeście (`.github/workflows/ci.yml`).

Plik `tests/app-globals.d.ts` deklaruje to, czego testy dotykają wewnątrz aplikacji;
przy okazji jest to spis jej publicznej powierzchni.

## Lokalnie

```sh
python3 -m http.server 8000   # http://localhost:8000
```
