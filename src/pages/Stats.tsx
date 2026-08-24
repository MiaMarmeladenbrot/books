import { useMemo, useState } from 'react'
import { useBooks } from '../store/useBooks'
import { ExportPanel } from '../components/ExportPanel'
import { formatCompact, formatNumber, monthNarrow, monthShort, readingDays } from '../utils/format'
import {
  BookStatus,
  FORMAT_LABEL,
  FORMAT_ORDER,
  PROVENANCE_LABEL,
  PROVENANCE_ORDER,
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

function Ranking({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <div>
      {rows.map((row) => (
        <div key={row.label} className="text-ink-2 flex items-center gap-2.5 py-1.5 text-sm">
          <span className="w-26 shrink-0">{row.label}</span>
          <span className="bg-shade h-2 flex-1 overflow-hidden rounded-full">
            <span
              className="bg-accent block h-full rounded-full"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </span>
          <b className="text-ink w-8 text-right font-semibold">{formatNumber(row.value)}</b>
        </div>
      ))}
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

        <Panel title="Auf einen Blick">
          <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
            <div>
              <div className="font-serif text-2xl font-semibold tracking-tight">{averagePages}</div>
              <div className="text-ink-2 text-xs">⌀ Seiten pro Buch</div>
            </div>
            <div>
              <div className="font-serif text-2xl font-semibold tracking-tight">{averageDays}</div>
              <div className="text-ink-2 text-xs">⌀ Tage pro Buch</div>
            </div>
            <div>
              <div className="font-serif text-2xl font-semibold tracking-tight">
                {longest?.page_count ?? '—'}
              </div>
              <div className="text-ink-2 text-xs truncate">
                {longest ? `längstes: ${longest.title}` : 'längstes Buch'}
              </div>
            </div>
            <div>
              <div className="font-serif text-2xl font-semibold tracking-tight">
                {monthShort(peakMonth)}
              </div>
              <div className="text-ink-2 text-xs">
                stärkster Monat, {perMonth[peakMonth].books} Bücher
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Format">
          <Ranking
            rows={FORMAT_ORDER.map((format) => ({
              label: FORMAT_LABEL[format],
              value: scope.filter((book) => book.format === format).length,
            })).filter((row) => row.value > 0)}
          />
        </Panel>

        <Panel title="Woher">
          <Ranking
            rows={PROVENANCE_ORDER.map((source) => ({
              label: PROVENANCE_LABEL[source],
              value: scope.filter((book) => book.provenance === source).length,
            })).filter((row) => row.value > 0)}
          />
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

        {year === ALL_YEARS && <ExportPanel books={books} />}
      </main>
    </div>
  )
}
