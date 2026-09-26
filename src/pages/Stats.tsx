import { useMemo, useState } from 'react'
import { useBooks } from '../store/useBooks'
import { Panel } from '../components/Panel'
import { formatCompact, formatNumber, formatPrice, monthNarrow, readingDays } from '../utils/format'
import { m } from '../paraglide/messages.js'
import {
  BookStatus,
  FORMAT_LABEL,
  FORMAT_ORDER,
  PROVENANCE_LABEL,
  PROVENANCE_ORDER,
  languageLabel,
} from '../types'
import type { Book } from '../types'

const ALL_YEARS = 'all'

const Metric = {
  Books: 'books',
  Pages: 'pages',
} as const

type Metric = (typeof Metric)[keyof typeof Metric]

const METRIC_LABEL: Record<Metric, () => string> = {
  [Metric.Books]: m.stats_books,
  [Metric.Pages]: m.stats_pages,
}

type FinishedBook = Book & { finished_on: string }

function isFinished(book: Book): book is FinishedBook {
  return book.status === BookStatus.Read && book.finished_on !== null
}

const SLICE_COLORS = [
  { fill: '#b4552f', text: '#fffefb' },
  { fill: '#17709f', text: '#fffefb' },
  { fill: '#d8a743', text: '#1e1a15' },
  { fill: '#5f9e6a', text: '#1e1a15' },
]

const CENTER = 50
const PIE_RADIUS = 47
const LABEL_RADIUS = 30
const SMALLEST_LABELLED_SHARE = 0.07

type Slice = { label: string; value: number; color: (typeof SLICE_COLORS)[number] }

const REST_COLOR = SLICE_COLORS[SLICE_COLORS.length - 1]
const UNKNOWN_COLOR = { fill: '#a09585', text: '#1e1a15' }

function withUnknown(rows: Slice[], unknown: number): Slice[] {
  const known = rows.filter((row) => row.value > 0)
  if (unknown === 0) return known
  return [...known, { label: m.stats_unknown(), value: unknown, color: UNKNOWN_COLOR }]
}

function PerMonth({ books }: { books: FinishedBook[] }) {
  const [metric, setMetric] = useState<Metric>(Metric.Books)

  const counts = useMemo(() => {
    const months = Array.from({ length: 12 }, () => ({ books: 0, pages: 0 }))
    for (const book of books) {
      const index = Number(book.finished_on.slice(5, 7)) - 1
      months[index].books += 1
      months[index].pages += book.page_count ?? 0
    }
    return months
  }, [books])

  const tallest = Math.max(...counts.map((entry) => entry[metric]), 1)
  const peak = counts.reduce(
    (best, entry, index) => (entry[metric] > counts[best][metric] ? index : best),
    0,
  )

  return (
    <Panel
      title={m.stats_per_month()}
      extra={
        <span className="bg-shade flex gap-0.5 rounded-full p-0.5">
          {[Metric.Books, Metric.Pages].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={metric === value}
              onClick={() => setMetric(value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold tracking-normal normal-case ${
                metric === value ? 'bg-ink text-paper' : 'text-ink-2'
              }`}
            >
              {METRIC_LABEL[value]()}
            </button>
          ))}
        </span>
      }
    >
      <div className="flex h-28 items-end gap-1.5">
        {counts.map((entry, index) => (
          <div key={index} className="flex h-full flex-1 flex-col items-center gap-1.5">
            <span className="flex min-h-0 w-full flex-1 items-end pt-4.5">
              <span
                className={`relative w-full rounded-t-xs ${index === peak ? 'bg-leaf' : 'bg-accent'}`}
                style={{ height: `${Math.max((entry[metric] / tallest) * 100, 2)}%` }}
              >
                <span className="text-ink-2 text-2xs absolute inset-x-0 bottom-full pb-1 text-center font-bold">
                  {entry[metric] ? formatCompact(entry[metric]) : ''}
                </span>
              </span>
            </span>
            <span className="text-ink-3 text-2xs font-medium">{monthNarrow(index)}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function countLanguages(books: Book[]) {
  const counts = new Map<string, number>()
  for (const book of books)
    if (book.language) counts.set(book.language, (counts.get(book.language) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function languageColors(books: Book[]) {
  const ordered = countLanguages(books)
  const named =
    ordered.length > SLICE_COLORS.length ? ordered.slice(0, SLICE_COLORS.length - 1) : ordered
  return new Map(named.map(([code], index) => [code, SLICE_COLORS[index]]))
}

function pointOn(radius: number, turns: number) {
  const angle = turns * 2 * Math.PI - Math.PI / 2
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)] as const
}

function wedgePath(from: number, to: number) {
  const [startX, startY] = pointOn(PIE_RADIUS, from)
  const [endX, endY] = pointOn(PIE_RADIUS, to)
  const sweptHalf = to - from > 0.5 ? 1 : 0
  return `M ${CENTER} ${CENTER} L ${startX} ${startY} A ${PIE_RADIUS} ${PIE_RADIUS} 0 ${sweptHalf} 1 ${endX} ${endY} Z`
}

function Pie({ rows }: { rows: Slice[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  if (total === 0) return null

  const ordered = [...rows].sort(
    (a, b) =>
      Number(a.color === UNKNOWN_COLOR) - Number(b.color === UNKNOWN_COLOR) || b.value - a.value,
  )
  const slices = ordered.map((row, index) => {
    const before = ordered.slice(0, index).reduce((sum, previous) => sum + previous.value, 0)
    return { ...row, from: before / total, to: (before + row.value) / total }
  })

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" aria-hidden="true" className="size-32 shrink-0">
        {slices.map((slice) => {
          const [labelX, labelY] = pointOn(LABEL_RADIUS, (slice.from + slice.to) / 2)
          return (
            <g key={slice.label}>
              {slices.length === 1 ? (
                <circle cx={CENTER} cy={CENTER} r={PIE_RADIUS} fill={slice.color.fill} />
              ) : (
                <path
                  d={wedgePath(slice.from, slice.to)}
                  fill={slice.color.fill}
                  stroke="var(--color-card)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              )}
              {slice.to - slice.from >= SMALLEST_LABELLED_SHARE && (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={slice.color.text}
                  className="text-[9px] font-semibold"
                >
                  {formatNumber(slice.value)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <ul className="min-w-0 flex-1">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2.5 py-1 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color.fill }}
            />
            <span className="min-w-0 flex-1 truncate">{slice.label}</span>
            {slice.to - slice.from < SMALLEST_LABELLED_SHARE && (
              <b className="text-ink-2 font-semibold">{formatNumber(slice.value)}</b>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Stats() {
  const { books } = useBooks()
  const [year, setYear] = useState<string>('')

  const finished = useMemo(() => books.filter(isFinished), [books])

  const years = useMemo(
    () =>
      [...new Set(finished.map((book) => book.finished_on.slice(0, 4)))].sort((a, b) =>
        b.localeCompare(a),
      ),
    [finished],
  )

  const activeYear = year || years[0] || ''
  const scope = useMemo(
    () =>
      year === ALL_YEARS
        ? finished
        : finished.filter((book) => book.finished_on.startsWith(activeYear)),
    [finished, year, activeYear],
  )

  const pages = scope.reduce((sum, book) => sum + (book.page_count ?? 0), 0)
  const withPages = scope.filter((book) => book.page_count)
  const averagePages = withPages.length
    ? Math.round(
        withPages.reduce((sum, book) => sum + (book.page_count ?? 0), 0) / withPages.length,
      )
    : 0
  const spans = scope
    .map((book) => readingDays(book.started_on, book.finished_on))
    .filter((days): days is number => days !== null)
  const averageDays = spans.length
    ? (spans.reduce((sum, days) => sum + days, 0) / spans.length).toFixed(1).replace('.', ',')
    : '—'
  const longest = scope.reduce<FinishedBook | null>(
    (best, book) => ((book.page_count ?? 0) > (best?.page_count ?? 0) ? book : best),
    null,
  )

  const priced = scope.filter(
    (book): book is FinishedBook & { price: number } => book.price !== null,
  )
  const spent = priced.reduce((sum, book) => sum + book.price, 0)
  const priciest = priced.reduce<(typeof priced)[number] | null>(
    (best, book) => (book.price > (best?.price ?? -1) ? book : best),
    null,
  )

  const colorOfLanguage = useMemo(() => languageColors(finished), [finished])

  const languages = useMemo(() => {
    const slices: Slice[] = []
    let rest = 0
    for (const [code, count] of countLanguages(scope)) {
      const color = colorOfLanguage.get(code)
      if (color) slices.push({ label: languageLabel(code), value: count, color })
      else rest += count
    }
    if (rest > 0) slices.push({ label: m.stats_language_other(), value: rest, color: REST_COLOR })
    return withUnknown(slices, scope.filter((book) => !book.language).length)
  }, [scope, colorOfLanguage])

  const topAuthors = useMemo(() => {
    const counts = new Map<string, number>()
    for (const book of scope)
      for (const author of book.authors) counts.set(author, (counts.get(author) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5)
  }, [scope])

  return (
    <div className="pb-28">
      <header className="border-line sticky top-0 z-10 border-b bg-paper/95 px-4 pt-3 pb-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">{m.stats_title()}</h1>
          <div className="no-scrollbar -mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
            {[ALL_YEARS, ...years].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setYear(value)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                  (year || years[0]) === value
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line bg-card text-ink-2'
                }`}
              >
                {value === ALL_YEARS ? m.stats_year_all() : value}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        <div className="flex gap-7 pt-1 pb-4">
          <div>
            <div className="font-serif text-4xl leading-none font-semibold tracking-tight">
              {formatNumber(scope.length)}
            </div>
            <div className="text-ink-2 mt-1.5 text-xs">
              {year === ALL_YEARS ? m.stats_books_total() : m.stats_books()}
            </div>
          </div>
          <div>
            <div className="font-serif text-4xl leading-none font-semibold tracking-tight">
              {formatNumber(pages)}
            </div>
            <div className="text-ink-2 mt-1.5 text-xs">
              {year === ALL_YEARS ? m.stats_pages_total() : m.stats_pages()}
            </div>
          </div>
        </div>

        {year !== ALL_YEARS && <PerMonth books={scope} />}

        <div className="grid gap-x-3.5 md:grid-cols-2">
          <Panel title={m.stats_at_a_glance()}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
              <div>
                <div className="font-serif text-2xl font-semibold tracking-tight">
                  {averagePages}
                </div>
                <div className="text-ink-2 text-xs">{m.stats_average_pages()}</div>
              </div>
              <div>
                <div className="font-serif text-2xl font-semibold tracking-tight">
                  {averageDays}
                </div>
                <div className="text-ink-2 text-xs">{m.stats_average_days()}</div>
              </div>
            </div>

            {longest?.page_count ? (
              <div className="border-line mt-4 border-t pt-3.5">
                <div className="text-ink-2 text-xs">
                  {m.stats_thickest({ count: longest.page_count })}
                </div>
                <div className="mt-1 text-sm leading-snug font-semibold">{longest.title}</div>
              </div>
            ) : null}
          </Panel>

          <Panel title={m.stats_top_authors()}>
            <ul>
              {topAuthors.map(([author, count], index) => (
                <li key={author} className="flex items-center gap-2.5 py-1 text-sm">
                  <span className="font-serif text-accent w-6 text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate">{author}</span>
                  <span className="text-ink-3 text-xs">{count}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-x-3.5 md:grid-cols-2">
          <Panel title={m.label_format()}>
            <Pie
              rows={withUnknown(
                FORMAT_ORDER.map((format, index) => ({
                  label: FORMAT_LABEL[format](),
                  value: scope.filter((book) => book.format === format).length,
                  color: SLICE_COLORS[index],
                })),
                scope.filter((book) => book.format === null).length,
              )}
            />
          </Panel>

          <Panel title={m.label_provenance()}>
            <Pie
              rows={withUnknown(
                PROVENANCE_ORDER.map((source, index) => ({
                  label: PROVENANCE_LABEL[source](),
                  value: scope.filter((book) => book.provenance === source).length,
                  color: SLICE_COLORS[index],
                })),
                scope.filter((book) => book.provenance === null).length,
              )}
            />
          </Panel>
        </div>

        <div className="grid gap-x-3.5 md:grid-cols-2">
          {languages.length > 0 && (
            <Panel title={m.label_language()}>
              <Pie rows={languages} />
            </Panel>
          )}

          {priciest && (
            <Panel
              title={m.label_price()}
              extra={
                <span className="text-ink-3 font-medium tracking-normal normal-case">
                  {m.stats_priced_share({ priced: priced.length, count: scope.length })}
                </span>
              }
            >
              <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
                <div>
                  <div className="font-serif text-2xl font-semibold tracking-tight">
                    {formatPrice(spent)}
                  </div>
                  <div className="text-ink-2 text-xs">{m.stats_spent()}</div>
                </div>
                <div>
                  <div className="font-serif text-2xl font-semibold tracking-tight">
                    {formatPrice(spent / priced.length)}
                  </div>
                  <div className="text-ink-2 text-xs">{m.stats_average_price()}</div>
                </div>
              </div>

              <div className="border-line mt-4 border-t pt-3.5">
                <div className="text-ink-2 text-xs">
                  {m.stats_priciest({ price: formatPrice(priciest.price) })}
                </div>
                <div className="mt-1 text-sm leading-snug font-semibold">{priciest.title}</div>
              </div>
            </Panel>
          )}
        </div>
      </main>
    </div>
  )
}
