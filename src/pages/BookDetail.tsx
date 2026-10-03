import { useId, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { useBooks } from '../store/useBooks'
import { Blurb } from '../components/Blurb'
import { Cover } from '../components/Cover'
import { useCatalogue } from '../lib/catalogue'
import { coverSources } from '../lib/cover'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatNumber, formatPrice, formatRange, readingDays } from '../utils/format'
import { m } from '../paraglide/messages.js'
import { BookStatus, FORMAT_LABEL, PROVENANCE_LABEL, STATUS_LABEL, languageLabel } from '../types'

const CUPS = [1, 2, 3, 4, 5]
const CUP_BODY = 'M6 7L20 7L19.1 23C18.9 24.6 18 25.5 16.6 25.5L9.4 25.5C8 25.5 7.1 24.6 6.9 23Z'

function TeaCup({ full, last }: { full: boolean; last: boolean }) {
  const clip = useId()
  const outline = full ? 'stroke-ink-2' : 'stroke-ink-3'

  return (
    <svg width={32} height={38} viewBox="0 -5 28 33" fill="none" strokeLinecap="round" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <path d={CUP_BODY} />
        </clipPath>
      </defs>
      {last && (
        <>
          <path d="M11 5.5q-1.5-2 0-4q1.5-2 0-4" className="stroke-ink-3" strokeWidth={1.2} />
          <path d="M15.5 5.5q-1.5-2 0-4q1.5-2 0-4" className="stroke-ink-3" strokeWidth={1.2} />
        </>
      )}
      {full ? (
        <rect x={5} y={9.9} width={17} height={20} className="fill-accent" clipPath={`url(#${clip})`} />
      ) : (
        <path d="M7.6 9.9H18.4" className="stroke-accent" strokeWidth={1.3} opacity={0.75} />
      )}
      {last && (
        <>
          <path d="M11.5 10.8Q10.5 3.5 7.4 4Q4 4.5 3.9 14" className={outline} strokeWidth={1.1} />
          <rect
            x={2.1}
            y={14}
            width={3.6}
            height={4.4}
            rx={0.6}
            className={`fill-paper ${outline}`}
            strokeWidth={1.1}
          />
        </>
      )}
      <path d={CUP_BODY} className={outline} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M19.9 10.3q4.9 .4 4.9 3.6q0 3.3 -4.6 3.7" className={outline} strokeWidth={1.6} />
    </svg>
  )
}

function Rating({ bookId, rating }: { bookId: string; rating: number | null }) {
  const label = useId()
  const { updateBook } = useBooks()
  const [pending, setPending] = useState<number | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const latest = useRef(0)

  const shown = pending === undefined ? rating : pending

  const rate = async (next: number | null) => {
    const ticket = ++latest.current
    setPending(next)
    setFailed(false)
    try {
      await updateBook(bookId, { rating: next })
    } catch {
      if (ticket === latest.current) setFailed(true)
    } finally {
      if (ticket === latest.current) setPending(undefined)
    }
  }

  return (
    <div className="mt-6">
      <p id={label} className="text-ink-3 mb-1 text-xs font-bold tracking-widest uppercase">
        {m.detail_rating()}
      </p>
      <div role="radiogroup" aria-labelledby={label} className="-ml-1 flex">
        {CUPS.map((count) => (
          <button
            key={count}
            type="button"
            role="radio"
            aria-checked={shown === count}
            aria-label={m.detail_rating_cups({ count })}
            onClick={() => rate(shown === count ? null : count)}
            className="p-1"
          >
            <TeaCup full={shown !== null && count <= shown} last={count === CUPS.length} />
          </button>
        ))}
      </div>
      {failed && <p className="text-danger mt-1 text-xs">{m.error_save_failed()}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="border-line text-ink-2 flex justify-between gap-6 border-b py-2.5 text-sm last:border-b-0">
      <span className="shrink-0">{label}</span>
      <b className="text-ink text-right font-semibold text-balance">{value}</b>
    </div>
  )
}

export function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { books, removeBook } = useBooks()
  const [confirming, setConfirming] = useState(false)

  const book = books.find((entry) => entry.id === id)
  const catalogue = useCatalogue(book?.isbn ?? null, book?.language ?? null)

  if (!book) {
    return <p className="text-ink-2 px-4 py-20 text-center text-sm">{m.error_book_not_found()}</p>
  }

  const days = readingDays(book.started_on, book.finished_on)

  const handleDelete = async () => {
    await removeBook(book.id)
    navigate('/', { replace: true })
  }

  return (
    <div className="pb-16">
      <header className="border-line sticky top-0 z-10 flex items-center gap-3 border-b bg-paper/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} aria-label={m.action_back()}>
          <ChevronLeft size={24} className="text-ink-3" />
        </button>
        <h1 className="font-serif text-xl font-semibold tracking-tight">{m.detail_heading()}</h1>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-5">
        <div className="mb-5 flex gap-4 sm:gap-6">
          <div className="w-29 shrink-0 sm:w-44">
            <Cover
              title={book.title}
              authors={book.authors}
              src={coverSources(book.isbn, book.cover_path)}
            />
          </div>
          <div className="flex min-w-0 grow flex-col">
            <h2 className="font-serif text-xl leading-tight font-semibold tracking-tight">
              {book.title}
            </h2>
            {book.subtitle && <p className="text-ink-2 mt-1 text-sm">{book.subtitle}</p>}
            <p className="text-ink-2 mt-1 text-sm">{book.authors.join(', ')}</p>
            <span className="bg-accent-soft text-accent mt-2.5 w-fit rounded-full px-2.5 py-1 text-xs font-semibold">
              {STATUS_LABEL[book.status]()}
            </span>

            <div className="mt-auto flex justify-end gap-2 pt-3.5">
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label={m.action_delete()}
                className="border-line text-ink-3 flex size-10 items-center justify-center rounded-xl border"
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
              <Link
                to={`/buch/${book.id}/bearbeiten`}
                aria-label={m.action_edit()}
                className="border-accent text-accent flex size-10 items-center justify-center rounded-xl border"
              >
                <Pencil size={18} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </div>

        <Row label={m.label_period()} value={formatRange(book.started_on, book.finished_on)} />
        <Row
          label={m.label_duration()}
          value={
            days === null
              ? null
              : days === 0
                ? m.detail_duration_same_day()
                : m.detail_duration_days({ count: days })
          }
        />
        <Row
          label={m.label_pages()}
          value={book.page_count ? formatNumber(book.page_count) : null}
        />
        <Row
          label={m.label_series()}
          value={
            book.series
              ? book.series_volume
                ? m.detail_series_volume({ series: book.series, volume: book.series_volume })
                : book.series
              : null
          }
        />
        <Row label={m.label_format()} value={book.format ? FORMAT_LABEL[book.format]() : null} />
        <Row
          label={m.label_language()}
          value={book.language ? languageLabel(book.language) : null}
        />
        <Row
          label={m.label_provenance()}
          value={book.provenance ? PROVENANCE_LABEL[book.provenance]() : null}
        />
        <Row label={m.label_price()} value={book.price === null ? null : formatPrice(book.price)} />
        <Row
          label={m.label_published()}
          value={book.published_year ? String(book.published_year) : null}
        />
        <Row label={m.label_isbn()} value={book.isbn} />

        {book.status !== BookStatus.WantToRead && (
          <Rating bookId={book.id} rating={book.rating} />
        )}

        {book.notes && (
          <div className="border-accent/35 mt-6 border-l-2 pl-4">
            <p className="text-ink-3 mb-1 text-xs font-bold tracking-widest uppercase">
              {m.label_note()}
            </p>
            <p className="font-serif text-sm leading-relaxed whitespace-pre-line italic">
              {book.notes}
            </p>
          </div>
        )}

        <Blurb text={catalogue.entry?.text ?? null} asking={catalogue.asking} />
      </main>

      <ConfirmDialog
        open={confirming}
        title={m.detail_delete_title()}
        description={m.detail_delete_body({ title: book.title })}
        confirmLabel={m.detail_delete_confirm()}
        cancelLabel={m.detail_delete_cancel()}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}
