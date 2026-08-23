# Lesestapel

Eine kleine Web-App, um gelesene Bücher zu erfassen und die eigene Lesestatistik zu sehen.
Ersatz für bookstats.de, mobile first, für einen einzigen Account.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router
- **Backend:** Supabase (Auth + Postgres, RLS pro Benutzer)
- **Daten:** eine Tabelle `books`, komplett im Browser gehalten und dort gefiltert

## Einrichten

```bash
npm install
cp .env.example .env   # Projekt-URL und Publishable Key eintragen
npm run dev
```

Das Schema liegt in `supabase/schema.sql` und wird einmal im SQL-Editor des
Supabase-Projekts ausgeführt. Den Benutzer legt man im Dashboard unter
Authentication an — die App hat absichtlich keine Registrierung.

## Skripte

| Befehl            | Zweck                           |
| ----------------- | ------------------------------- |
| `npm run dev`     | Entwicklungsserver              |
| `npm run build`   | Typecheck und Produktions-Build |
| `npm run preview` | Produktions-Build lokal ansehen |
| `npm run lint`    | oxlint über das Projekt         |

## Herkunft der Daten

Der Altbestand von 501 Büchern kam am 23.08.2026 aus einem Excel-Export von
bookstats.de und wurde einmalig per Skript aufgeräumt und importiert. Titel,
Autoren, Format und Herkunft wurden dabei normalisiert; die jeweiligen
Originalwerte stehen weiterhin im Feld `source_meta` jedes Buchs. Skript und
Zwischendateien sind nach dem Import entfernt worden.

## Datenmodell

Interne Werte sind englisch (`reading`, `paperback`, `borrowed`), angezeigt wird
deutsch — die Zuordnung steht in `src/types.ts`. Autoren sind ein `text[]` aus
Anzeigenamen, nicht in Vor- und Nachname getrennt: das bricht an Namen wie
`Emily St. John Mandel` oder `Jang Ryujin`, wo der Nachname vorn steht.

## Geplant

- ISBN-Suche über die Deutsche Nationalbibliothek, damit Erfassen ein Feld statt
  acht braucht; Cover dazu über den MVB-Coverservice
- PWA-Manifest, damit die App als Icon auf dem Homescreen liegt
- Export als CSV und JSON
