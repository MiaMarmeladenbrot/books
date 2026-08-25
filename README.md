# Lesestapel

A small web app for recording books read and seeing the reading statistics that
follow from them. It replaces bookstats.de, is mobile first, and serves two
accounts which, thanks to row level security, never see each other's shelves.
The interface is German; everything else in this repository is English.

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
   `books` table, its indexes, four RLS policies, the `updated_at` trigger and
   `cover_is_orphaned`, the one function a browser cannot answer for itself.
2. Create each account by hand under Authentication. The app has no sign-up on
   purpose, so a new reader is one row in `auth.users` and nothing else.
3. Create a public storage bucket named `cover` and grant the accounts access to
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

The covers of both imported libraries were fetched once from the MVB service
behind the DNB portal and from Open Library, and are named after their ISBN.
Uploads from the app add a timestamp, `<isbn>-<epoch>.jpg`, because covers are
served with `Cache-Control: immutable` for a year: a changed picture therefore
has to mean a changed URL. Replacing a cover through the app deletes the previous
file, and so does deleting a book.

The bucket is shared by both accounts, so naming a file after its ISBN means one
file for an edition both of them own — which is the point, but it also means an
import cannot assume it may write. Supabase answers such an upload with HTTP 400
and a 409 body, `KeyAlreadyExists`, and the honest reaction is to leave the file
alone and point the new row at it.

Sharing files makes deleting one a question about other people's rows, which is
exactly what row level security stops a browser from asking. Deleting a book or
replacing its picture therefore gives up the pointer first and asks
`public.cover_is_orphaned`, a `security definer` function that counts references
across both accounts, whether anything still points at the file; only then is it
removed. When that call fails nothing is deleted, because an orphaned file costs
a few kilobytes and a wrongly deleted one costs somebody their cover.

Tiles are 5:8 rather than the obvious 2:3. Measured over the first 412 covers, a
2:3 box cropped 87 percent of them at top and bottom, which is where the title
and the author sit; 5:8 lies just below the 25th percentile of the real ratios,
so what little cropping remains happens at the sides.

## Where the data came from

The 501 books of the old library came out of an Excel export from bookstats.de on
23 August 2026 and were cleaned up and imported once by script. Titles, authors,
format and provenance were normalised on the way in, and the original value of
each is still kept in the `source_meta` column. The script and its intermediate
files were removed after the import.

Checking those values against the Deutsche Nationalbibliothek and Open Library
afterwards turned up no wrong ISBN and no wrong page count. Where a catalogue
disagrees it is usually a different edition, so the imported numbers were kept.

The second account was filled the same way on 24 August 2026, from a spreadsheet
of 239 books kept as two lists side by side: read on the left with a reading
year, wanted on the right, author and title and nothing else. Two entries on the
right carried a page number instead, which is what being read looks like in a
spreadsheet. One book stood on both lists and was imported once, the two already
entered by hand were left alone, and so 236 rows were written. Because the sheet
knows only years, a read book carries 31 December of its year as `finished_on`,
and the 23 that predate the list carry no date at all, which is what keeps them
out of every yearly figure. The spreadsheet's own wording stays in
`source_meta.import`, the record that matched it in `source_meta.catalogue`.

ISBN, page count, publication year and cover were looked up per title against the
same two catalogues. Both were asked for every book and the better record won,
because asking the DNB first and Open Library only on failure hands a novel to
the 128-page school reader of it. Matching was on title and family name, which
resolved the typos of a spreadsheet — `Sarte`, `Cornrad`, `Möchet` — while
keeping `Tagebuch` by Anne Frank away from `Die Tagebücher` by Frank Wedekind.
Foreign-language editions, school readers and audiobooks lose the ranking, and a
page count is believed only where the catalogue counts pages rather than CDs or
minutes.

Four books ended up without a page count and two of those without an ISBN,
`Harry Potter 1-7` among them: seven volumes in one row have no single edition,
and a 28-page booklet is a worse answer than none. Another 32 have no cover. A
script is not bound by CORS the way the app is, so it could take the better MVB
scans for almost all of the rest; what is missing is missing from both services,
or too small and too oddly proportioned to pass the checks in `api/cover.ts`.

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
searched as a title and offers the matches. The book form then opens prefilled,
with the status set to read.

The dates stay empty. Guessing today is right often enough to be tempting, but
entering a date costs less than noticing a wrong one and clearing it, and a read
book carrying no finish date stays out of every yearly figure until it gets one
— which is the honest state for a book whose date nobody has said yet.

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

## Scanning the barcode

The same field also takes a scan. Every barcode on a book is a Bookland EAN-13,
which is the ISBN-13 itself, so a read feeds the exact lookup a typed number
does and nothing behind the field had to change.

Decoding is zbar compiled to WebAssembly. The browser's own `BarcodeDetector`
costs no bytes at all, but Safari does not implement it, and a second decoder
that only ever runs on the other reader's phone is a path that rots untested —
so the one that works everywhere is the only one. It loads on the first scan and
not before, 175 KB of WASM and its wrapper as their own chunks, and the shelf
therefore starts exactly as fast as it did.

Only EAN-13 is enabled, and a decoded number counts as a book when it begins
with 978 or 979 and its check digit holds. Books carry a second, smaller barcode
for the price, and without that rule a scan succeeds cheerfully with `52799`.

Only the area under the framing guide is read, mapped from screen coordinates
back into the camera frame in `src/lib/frame.ts`. `object-cover` hides a good
part of a landscape stream on a portrait phone, so scanning the whole frame meant
the guide did not describe what was actually decoded. The camera is asked for
1920 pixels and the crop is decoded at up to 1024 of them, which is both sharper
and cheaper than the full frame was.

Everything about those numbers comes down to one threshold: a barcode needs
roughly two pixels per module to decode at all. Scanning whole frames 640 wide
was plenty on a photograph but lost the left half of a 16:9 video frame — the
first digit is not printed as bars, it is carried by the parity pattern of the
left group, so a soft left edge produced a different number almost every frame
and one of them even satisfied the check digit. That steadied at 960. On a phone
the frame was big enough and the guide was the fault: at 5:2 it was far wider
than a barcode's own 1.6:1, so it could not be filled, and a barcode centred in
it reached 1.7 pixels per module. The guide is 3:2 now, and filling it gives 5.5.

A number is accepted only once it arrives twice in a row, which is what keeps
those unstable frames out of the form and costs a tenth of a second. While it
looks, the overlay separates nothing in view from a code it has seen but cannot
confirm yet, because silence is indistinguishable from a broken feature.

A camera needs a secure context. `npm run dev` on localhost qualifies, so
scanning can be developed locally, but trying it from a phone means a deployed
preview rather than a LAN address.

## Planned

- A web app manifest, so the app sits on the home screen without browser chrome.
