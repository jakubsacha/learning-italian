# Włoski — 250 słów

Jednoplikowa aplikacja do nauki włoskiego (fiszki, quiz, układanie zdań) dla osób mówiących po polsku.
Całość to statyczny `index.html` — bez backendu, bez zależności. Postęp zapisuje się w `localStorage` przeglądarki.

## Live

https://jakubsacha.github.io/learning-italian/

## Deploy

Publikacja odbywa się automatycznie przez GitHub Actions (`.github/workflows/pages.yml`)
przy każdym pushu na `main`.

Jednorazowa konfiguracja w repozytorium:
**Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Lokalnie

```sh
python3 -m http.server 8000   # http://localhost:8000
```
