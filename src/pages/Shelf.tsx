import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, ScanBarcode, Search, X } from 'lucide-react'
import { useBooks } from '../store/useBooks'
import { Cover } from '../components/Cover'
import { Select } from '../components/Select'
import { coverUrl } from '../lib/supabase'
import { formatDay, formatNumber, monthKey, monthLabel } from '../utils/format'
import {
  BookStatus,
  FORMAT_LABEL,
  FORMAT_ORDER,
  PROVENANCE_LABEL,
  PROVENANCE_ORDER,
  STATUS_LABEL,
} from '../types'
import type { Book } from '../types'

const NO_DATE_KEY = 'no-date'

type Choice = { value: string; label: string; matches: (book: Book) => boolean }
type Dimension = { param: string; all: string; choices: Choice[] }

function buildDimensions(books: Book[]): Dimension[] {
  const years = [
    ...new Set(books.map((book) => (book.finished_on ?? book.started_on)?.slice(0, 4))),
  ]
    .filter((year): year is string => Boolean(year))
    .sort((a, b) => b.localeCompare(a))

  const dimensions: Dimension[] = [
    {
      param: 'status',
      all: 'Jeder Status',
      choices: [
        BookStatus.Read,
        BookStatus.Reading,
        BookStatus.WantToRead,
        BookStatus.Abandoned,
      ].map((status) => ({
        value: status,
        label: STATUS_LABEL[status],
        matches: (book: Book) => book.status === status,
      })),
    },
    {
      param: 'year',
      all: 'Jedes Jahr',
      choices: years.map((year) => ({
        value: year,
        label: year,
        matches: (book: Book) => (book.finished_on ?? book.started_on ?? '').startsWith(year),
      })),
    },
    {
      param: 'format',
      all: 'Jedes Format',
      choices: FORMAT_ORDER.filter((format) => books.some((book) => book.format === format)).map(
        (format) => ({
          value: format,
          label: FORMAT_LABEL[format],
          matches: (book: Book) => book.format === format,
        }),
      ),
    },
    {
      param: 'provenance',
      all: 'Jede Herkunft',
      choices: PROVENANCE_ORDER.filter((source) =>
        books.some((book) => book.provenance === source),
      ).map((source) => ({
        value: source,
        label: PROVENANCE_LABEL[source],
        matches: (book: Book) => book.provenance === source,
      })),
    },
  ]

  return dimensions.filter((dimension) => dimension.choices.length > 0)
}

function MetaLine({ book }: { book: Book }) {
  if (book.status === BookStatus.Reading) {
    const since = formatDay(book.started_on)
    return (
      <p className="text-leaf text-xs font-medium">
        {since ? `seit ${since}` : STATUS_LABEL[book.status]}
      </p>
    )
  }

  const text =
    book.status === BookStatus.Read
      ? (formatDay(book.finished_on ?? book.started_on) ?? '—')
      : [STATUS_LABEL[book.status], formatDay(book.finished_on)].filter(Boolean).join(', ')

  return <p className="text-ink-3 text-xs">{text}</p>
}

function groupByMonth(books: Book[]) {
  const groups: { key: string; books: Book[] }[] = []
  for (const book of books) {
    const date = book.finished_on ?? book.started_on
    const key = date ? monthKey(date) : NO_DATE_KEY
    const last = groups.at(-1)
    if (last?.key === key) last.books.push(book)
    else groups.push({ key, books: [book] })
  }
  return groups
}

export function Shelf() {
  const { books, loading, error, reload } = useBooks()
  const [retrying, setRetrying] = useState(false)

  const retry = async () => {
    setRetrying(true)
    await reload()
    setRetrying(false)
  }
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''

  const updateParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const dimensions = useMemo(() => buildDimensions(books), [books])

  const visible = useMemo(() => {
    const chosen = dimensions.flatMap((dimension) => {
      const choice = dimension.choices.find((entry) => entry.value === params.get(dimension.param))
      return choice ? [choice] : []
    })
    const needle = query.trim().toLowerCase()
    return books.filter((book) => {
      if (!chosen.every((choice) => choice.matches(book))) return false
      if (!needle) return true
      const haystack = [book.title, book.subtitle, book.series, ...book.authors]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [books, dimensions, params, query])

  const groups = useMemo(() => groupByMonth(visible), [visible])

  const narrowed =
    query.trim() !== '' || dimensions.some((dimension) => params.get(dimension.param))

  const showEverything = () =>
    updateParams({
      q: '',
      ...Object.fromEntries(dimensions.map((dimension) => [dimension.param, ''])),
    })

  return (
    <div className="pb-28">
      <header className="border-line sticky top-0 z-10 border-b bg-paper/95 px-4 pt-3 pb-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-baseline gap-3">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Lesestapel</h1>
          <span className="text-ink-3 ml-auto text-xs font-medium">
            {loading
              ? 'lädt…'
              : visible.length === books.length
                ? `${formatNumber(books.length)} Bücher`
                : `${formatNumber(visible.length)} von ${formatNumber(books.length)}`}
          </span>
          {narrowed && (
            <button
              type="button"
              onClick={showEverything}
              className="text-ink-2 decoration-line shrink-0 text-xs font-medium underline underline-offset-3"
            >
              Alles zeigen
            </button>
          )}
        </div>

        <div className="mx-auto mt-2.5 max-w-5xl">
          <div className="border-line bg-card flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5">
            <Search size={17} className="text-ink-3 shrink-0" />
            <input
              value={query}
              onChange={(event) => updateParams({ q: event.target.value })}
              placeholder="Titel oder Autorin suchen…"
              className="placeholder:text-ink-3 w-full bg-transparent text-sm outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => updateParams({ q: '' })}
                aria-label="Suche zurücksetzen"
                className="text-ink-3 shrink-0 p-1"
              >
                <X size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/buch/suchen', { state: { scan: true } })}
              aria-label="Barcode scannen"
              className="text-ink-2 -mr-1 shrink-0 p-1"
            >
              <ScanBarcode size={19} />
            </button>
          </div>

          <div className="no-scrollbar -mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
            {dimensions.map((dimension) => {
              const value = params.get(dimension.param) ?? ''
              return (
                <Select
                  key={dimension.param}
                  value={value}
                  onChange={(event) => updateParams({ [dimension.param]: event.target.value })}
                  aria-label={dimension.all}
                  wrapper="shrink-0"
                  chevron={value ? 'text-paper' : 'text-ink-3'}
                  className={`rounded-full border py-1.5 pr-8 pl-3.5 text-sm font-medium ${
                    value ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink-2'
                  }`}
                >
                  <option value="" className="bg-card text-ink">
                    {dimension.all}
                  </option>
                  {dimension.choices.map((choice) => (
                    <option key={choice.value} value={choice.value} className="bg-card text-ink">
                      {choice.label}
                    </option>
                  ))}
                </Select>
              )
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4">
        {error && (
          <div className="py-8 text-center">
            <p className="text-danger mb-1 text-sm">Deine Bücher konnten nicht geladen werden.</p>
            <p className="text-ink-3 mb-4 text-xs">{error}</p>
            <button
              type="button"
              onClick={() => void retry()}
              disabled={retrying}
              className="border-line text-ink-2 rounded-xl border px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {retrying ? 'Lädt…' : 'Nochmal versuchen'}
            </button>
          </div>
        )}

        {!loading && visible.length === 0 && (
          <p className="text-ink-2 py-16 text-center text-sm">
            {books.length === 0 ? 'Noch keine Bücher.' : 'Nichts gefunden.'}
          </p>
        )}

        {groups.map((group) => (
          <section key={group.key} className="mt-9 first:mt-0">
            <h2 className="font-serif mb-2.5 flex items-baseline gap-2.5 text-sm font-semibold">
              <span>{group.key === NO_DATE_KEY ? 'Ohne Datum' : monthLabel(group.key)}</span>
              <span className="text-ink-3 font-sans text-xs font-medium">
                {group.books.length}
              </span>
              <span className="bg-line h-px flex-1" />
            </h2>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {group.books.map((book) => (
                <li key={book.id}>
                  <Link to={`/buch/${book.id}`} className="block">
                    <Cover
                      title={book.title}
                      authors={book.authors}
                      src={coverUrl(book.cover_path)}
                      className={
                        book.status === BookStatus.Reading
                          ? 'outline-leaf outline-2 outline-offset-3'
                          : ''
                      }
                    />
                    <h3 className="mt-2.5 line-clamp-2 text-sm leading-snug font-semibold">
                      {book.title}
                    </h3>
                    <p className="text-ink-2 truncate text-xs">{book.authors.join(', ')}</p>
                    <MetaLine book={book} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20">
        <div className="mx-auto flex max-w-296 justify-end px-4">
          <button
            type="button"
            onClick={() => navigate('/buch/suchen')}
            aria-label="Buch erfassen"
            className="bg-accent pointer-events-auto flex size-14 items-center justify-center rounded-full text-white shadow-[0_8px_20px_-6px_rgb(180_85_47/0.7)]"
          >
            <Plus size={26} />
          </button>
        </div>
      </div>
    </div>
  )
}
