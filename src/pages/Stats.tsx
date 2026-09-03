import { useMemo, useState } from 'react'
import { useBooks } from '../store/useBooks'
import { ExportPanel } from '../components/ExportPanel'
import { formatCompact, formatNumber, monthNarrow, readingDays } from '../utils/format'
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

const METRIC_LABEL: Record<Metric, string> = {
  [Metric.Books]: 'Bücher',
  [Metric.Pages]: 'Seiten',
}

type FinishedBook = Book & { finished_on: string }

function isFinished(book: Book): book is FinishedBook {
  return book.status === BookStatus.Read && book.finished_on !== null
}

function Panel({
  title,
  extra,
  children,
}: {
  title: string
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border-line bg-card mb-3.5 rounded-2xl border px-4 py-4">
      <h2 className="text-ink-3 mb-3.5 flex items-baseline text-xs font-bold tracking-widest uppercase">
        {title}
        {extra ? <span className="ml-auto">{extra}</span> : null}
      </h2>
      {children}
    </section>
  )
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

  const ordered = [...rows].sort((a, b) => b.value - a.value)
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
  const [metric, setMetric] = useState<Metric>(Metric.Books)

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
    .filter((days): days is number => days !== null && days >= 0 && days < 200)
  const averageDays = spans.length
    ? (spans.reduce((sum, days) => sum + days, 0) / spans.length).toFixed(1).replace('.', ',')
    : '—'
  const longest = scope.reduce<FinishedBook | null>(
    (best, book) => ((book.page_count ?? 0) > (best?.page_count ?? 0) ? book : best),
    null,
  )

  const perMonth = useMemo(() => {
    const counts = Array.from({ length: 12 }, () => ({ books: 0, pages: 0 }))
    for (const book of scope) {
      const index = Number(book.finished_on.slice(5, 7)) - 1
      counts[index].books += 1
      counts[index].pages += book.page_count ?? 0
    }
    return counts
  }, [scope])

  const monthMax = Math.max(...perMonth.map((entry) => entry[metric]), 1)
  const peakMonth = perMonth.reduce(
    (best, entry, index) => (entry.books > perMonth[best].books ? index : best),
    0,
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
    if (rest > 0) slices.push({ label: 'Andere', value: rest, color: REST_COLOR })
    return slices
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
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Statistik</h1>
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
                {value === ALL_YEARS ? 'Alle' : value}
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
              Bücher {year === ALL_YEARS ? 'insgesamt' : activeYear}
            </div>
          </div>
          <div>
            <div className="font-serif text-4xl leading-none font-semibold tracking-tight">
              {formatNumber(pages)}
            </div>
            <div className="text-ink-2 mt-1.5 text-xs">
              Seiten {year === ALL_YEARS ? 'insgesamt' : activeYear}
            </div>
          </div>
        </div>

        {year !== ALL_YEARS && (
          <Panel
            title="Pro Monat"
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
                    {METRIC_LABEL[value]}
                  </button>
                ))}
              </span>
            }
          >
            <div className="flex h-28 items-end gap-1.5">
              {perMonth.map((entry, index) => (
                <div
                  key={index}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span className="text-ink-2 text-2xs font-bold">
                    {entry[metric] ? formatCompact(entry[metric]) : ''}
                  </span>
                  <span
                    className={`w-full rounded-t-xs ${
                      index === peakMonth ? 'bg-leaf' : 'bg-accent'
                    }`}
                    style={{ height: `${Math.max((entry[metric] / monthMax) * 100, 2)}%` }}
                  />
                  <span className="text-ink-3 text-2xs font-medium">{monthNarrow(index)}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <div className="grid gap-x-3.5 md:grid-cols-2">
          <Panel title="Auf einen Blick">
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
              <div>
                <div className="font-serif text-2xl font-semibold tracking-tight">
                  {averagePages}
                </div>
                <div className="text-ink-2 text-xs">⌀ Seiten pro Buch</div>
              </div>
              <div>
                <div className="font-serif text-2xl font-semibold tracking-tight">
                  {averageDays}
                </div>
                <div className="text-ink-2 text-xs">⌀ Tage pro Buch</div>
              </div>
            </div>

            {longest?.page_count ? (
              <div className="border-line mt-4 border-t pt-3.5">
                <div className="text-ink-2 text-xs">Dickstes Buch</div>
                <div className="mt-1 text-sm leading-snug font-semibold">
                  {longest.title}
                  <span className="text-ink-2 ml-2 text-xs font-normal whitespace-nowrap">
                    {formatNumber(longest.page_count)} Seiten
                  </span>
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel title={`Meistgelesene Autor:innen ${year === ALL_YEARS ? '' : `${activeYear}`}`}>
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
          <Panel title="Format">
            <Pie
              rows={FORMAT_ORDER.map((format, index) => ({
                label: FORMAT_LABEL[format],
                value: scope.filter((book) => book.format === format).length,
                color: SLICE_COLORS[index],
              })).filter((row) => row.value > 0)}
            />
          </Panel>

          <Panel title="Woher">
            <Pie
              rows={PROVENANCE_ORDER.map((source, index) => ({
                label: PROVENANCE_LABEL[source],
                value: scope.filter((book) => book.provenance === source).length,
                color: SLICE_COLORS[index],
              })).filter((row) => row.value > 0)}
            />
          </Panel>
        </div>

        {languages.length > 0 && (
          <Panel title="Sprache">
            <Pie rows={languages} />
          </Panel>
        )}

        {year === ALL_YEARS && <ExportPanel books={books} />}
      </main>
    </div>
  )
}
