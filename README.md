# Lesestapel

A small web app for recording books read and seeing the reading statistics that
follow from them. It replaces bookstats.de, is mobile first, and serves a single
account. The interface is German; everything else in this repository is English.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router
- **Backend:** Supabase — auth, Postgres with row level security, storage for covers
- **Data:** one `books` table, loaded once and filtered in the browser

Loading every book at startup costs about 500 KB and makes search, filtering and
all statistics instant without a single further request. Covers deliberately stay
out of that payload; they are files in a bucket, so the browser can cache them.

## Setup

```bash
npm install
cp .env.example .env   # project URL and publishable key
npm run dev
```

Three things are prepared in Supabase itself:

1. Run `supabase/schema.sql` once in the SQL editor. It creates the enums, the
   `books` table, its indexes, four RLS policies and the `updated_at` trigger.
2. Create the account under Authentication. The app has no sign-up on purpose.
3. Create a public storage bucket named `cover` and grant the account access to
   it, see `supabase/storage.sql`.

## Scripts

| Command           | Purpose                        |
| ----------------- | ------------------------------ |
| `npm run dev`     | Development server             |
| `npm run build`   | Type check and production build |
| `npm run preview` | Serve the production build     |
| `npm run lint`    | Run oxlint over the project    |

## Covers

A cover lives in the `cover` bucket and the book row points at it through
`cover_path`; the file name is never derived from the book. Books without a cover
fall back to a pattern generated from the title, which also catches an image that
fails to load.

The 412 covers of the imported library were fetched once from the MVB service
behind the DNB portal and from Open Library, and are named after their ISBN.
Uploads from the app add a timestamp, `<isbn>-<epoch>.jpg`, because covers are
served with `Cache-Control: immutable` for a year: a changed picture therefore
has to mean a changed URL. Replacing a cover through the app deletes the previous
file, and so does deleting a book.

Tiles are 5:8 rather than the obvious 2:3. Measured over the 412 covers, a 2:3
box cropped 87 percent of them at top and bottom, which is where the title and
the author sit; 5:8 lies just below the 25th percentile of the real ratios, so
what little cropping remains happens at the sides.

## Where the data came from

The 501 books of the old library came out of an Excel export from bookstats.de on
23 August 2026 and were cleaned up and imported once by script. Titles, authors,
format and provenance were normalised on the way in, and the original value of
each is still kept in the `source_meta` column. The script and its intermediate
files were removed after the import.

Checking those values against the Deutsche Nationalbibliothek and Open Library
afterwards turned up no wrong ISBN and no wrong page count. Where a catalogue
disagrees it is usually a different edition, so the imported numbers were kept.

## Data model

Stored values are English — `reading`, `paperback`, `borrowed` — and the German
labels shown on screen are mapped in `src/types.ts`. Authors are a `text[]` of
display names rather than separate first and last names, which breaks on
`Emily St. John Mandel` and on `Jang Ryujin`, where the family name comes first.

Statistics count a book when it is read and carries a finish date, and they count
it in the year of that date. Books being read, abandoned or merely wanted are not
part of any yearly figure.

## Backup

The statistics page exports the whole library: JSON as a complete, re-importable
backup including `source_meta`, CSV with German headers for a spreadsheet. Both
are generated in the browser. The covers are not part of it, but they can be
fetched again from their ISBN.

## Adding a book

Adding starts with a search rather than an empty form. One field takes both an
ISBN and a title: ten or thirteen digits are looked up exactly, anything else is
searched as a title and offers the matches. The book form then opens prefilled
and save-ready, with today's dates and the status set to read, so a book found in
the catalogue is one tap away.

Both catalogues are queried straight from the browser — the DNB and Open Library
each send permissive CORS headers, so no server sits in between and nothing has
to be deployed alongside the app. The DNB is asked first because it carries the
German editions; Open Library answers for most of the rest, and adds the covers.

Three filters come from reconciling the imported library against these same
catalogues. Field 700 of a MARC record holds translators and name-title entries
as often as further authors, so entries carrying a `$t` or a non-`aut` relator
are dropped. Series names are checked against publisher imprints, or books end
up in a series called `KiWi` or `Goldmann`. And study guides and audio editions
are filtered out of title matches.

Covers can only be taken from Open Library, whose images are readable across
origins; the better scans behind the DNB portal are not, which is why a German
new arrival sometimes has no proposed cover. Uploading one by hand covers that
case.

## Planned

- A barcode scanner feeding the same search field.
- A web app manifest, so the app sits on the home screen without browser chrome.
