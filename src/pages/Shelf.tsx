import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useBooks } from '../store/useBooks'
import { Cover } from '../components/Cover'
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
const DEFAULT_FILTER = 'all'

type Filter = { key: string; label: string; matches: (book: Book) => boolean }

function buildFilters(books: Book[]): Filter[] {
  const years = [
    ...new Set(books.map((book) => (book.finished_on ?? book.started_on)?.slice(0, 4))),
  ]
    .filter((year): year is string => Boolean(year))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 3)

  return [
    { key: 'all', label: 'Alle', matches: () => true },
    {
      key: 'read',
      label: 'Gelesen',
      matches: (book) => book.status === BookStatus.Read,
    },
    {
      key: 'reading',
      label: 'Am Lesen',
      matches: (book) => book.status === BookStatus.Reading,
    },
    {
      key: 'want_to_read',
      label: 'Wunschliste',
      matches: (book) => book.status === BookStatus.WantToRead,
    },
    ...years.map((year) => ({
      key: `year-${year}`,
      label: year,
      matches: (book: Book) => (book.finished_on ?? book.started_on ?? '').startsWith(year),
    })),
    ...FORMAT_ORDER.filter((format) => books.some((book) => book.format === format)).map(
      (format) => ({
        key: `format-${format}`,
        label: FORMAT_LABEL[format],
        matches: (book: Book) => book.format === format,
      }),
    ),
    ...PROVENANCE_ORDER.filter((source) => books.some((book) => book.provenance === source)).map(
      (source) => ({
        key: `provenance-${source}`,
        label: PROVENANCE_LABEL[source],
        matches: (book: Book) => book.provenance === source,
      }),
    ),
  ]
}

function MetaLine({ book }: { book: Book }) {
  if (book.status === BookStatus.Reading) {
    const since = formatDay(book.started_on)
    return (
      <p className="text-leaf text-[11.5px] font-medium">
        {since ? `seit ${since}` : STATUS_LABEL[book.status]}
      </p>
    )
  }

  const text =
    book.status === BookStatus.Read
      ? formatDay(book.finished_on ?? book.started_on) ?? '—'
      : [STATUS_LABEL[book.status], formatDay(book.finished_on)].filter(Boolean).join(', ')

  return <p className="text-ink-3 text-[11.5px]">{text}</p>
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
  const { books, loading, error } = useBooks()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const activeFilter = params.get('filter') ?? DEFAULT_FILTER

  const updateParams = (changes: { q?: string; filter?: string }) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value && value !== DEFAULT_FILTER) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const filters = useMemo(() => buildFilters(books), [books])

  const visible = useMemo(() => {
    const filter = filters.find((entry) => entry.key === activeFilter) ?? filters[0]
    const needle = query.trim().toLowerCase()
    return books.filter((book) => {
      if (!filter.matches(book)) return false
      if (!needle) return true
      const haystack = [book.title, book.subtitle, book.series, ...book.authors]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [books, filters, activeFilter, query])

  const groups = useMemo(() => groupByMonth(visible), [visible])

  return (
    <div className="pb-28">
      <header className="border-line sticky top-0 z-10 border-b bg-paper/95 px-4 pt-3 pb-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-baseline gap-3">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Lesestapel</h1>
          <span className="text-ink-3 ml-auto text-xs font-medium">
            {loading ? 'lädt…' : `${formatNumber(books.length)} Bücher`}
          </span>
        </div>

        <div className="mx-auto mt-2.5 max-w-5xl">
          <div className="border-line bg-card flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5">
            <Search size={17} className="text-ink-3 shrink-0" />
            <input
              value={query}
              onChange={(event) => updateParams({ q: event.target.value })}
              placeholder="Titel oder Autorin suchen…"
              className="placeholder:text-ink-3 w-full bg-transparent text-[15px] outline-none"
            />
          </div>

          <div className="no-scrollbar -mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => updateParams({ filter: filter.key })}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${
                  activeFilter === filter.key
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line bg-card text-ink-2'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4">
        {error && <p className="text-danger py-6 text-sm">{error}</p>}

        {!loading && visible.length === 0 && (
          <p className="text-ink-2 py-16 text-center text-sm">
            {books.length === 0 ? 'Noch keine Bücher.' : 'Nichts gefunden.'}
          </p>
        )}

        {groups.map((group) => (
          <section key={group.key} className="mt-9 first:mt-0">
            <h2 className="font-serif mb-2.5 flex items-baseline gap-2.5 text-[15px] font-semibold">
              <span>{group.key === NO_DATE_KEY ? 'Ohne Datum' : monthLabel(group.key)}</span>
              <span className="text-ink-3 font-sans text-[11.5px] font-medium">
                {group.books.length}
              </span>
              <span className="bg-line h-px flex-1" />
            </h2>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {group.books.map((book) => (
                <li key={book.id}>
                  <Link to={`/buch/${book.id}`} className="block">
                    <Cover
                      book={book}
                      className={
                        book.status === BookStatus.Reading
                          ? 'outline-leaf outline-2 outline-offset-[3px]'
                          : ''
                      }
                    />
                    <h3 className="mt-2.5 line-clamp-2 text-[13.5px] leading-snug font-semibold">
                      {book.title}
                    </h3>
                    <p className="text-ink-2 truncate text-[12.5px]">{book.authors.join(', ')}</p>
                    <MetaLine book={book} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <button
        type="button"
        onClick={() => navigate('/buch/neu')}
        aria-label="Buch erfassen"
        className="bg-accent fixed right-4 bottom-24 z-20 flex size-14 items-center justify-center rounded-full text-white shadow-[0_8px_20px_-6px_rgb(180_85_47/0.7)]"
      >
        <Plus size={26} />
      </button>
    </div>
  )
}
