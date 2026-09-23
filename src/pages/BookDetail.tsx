import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { useBooks } from '../store/useBooks'
import { Blurb } from '../components/Blurb'
import { Cover } from '../components/Cover'
import { useCatalogue } from '../lib/catalogue'
import { coverSources } from '../lib/cover'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatNumber, formatRange, readingDays } from '../utils/format'
import { FORMAT_LABEL, PROVENANCE_LABEL, STATUS_LABEL, languageLabel } from '../types'

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
    return <p className="text-ink-2 px-4 py-20 text-center text-sm">Buch nicht gefunden.</p>
  }

  const days = readingDays(book.started_on, book.finished_on)

  const handleDelete = async () => {
    await removeBook(book.id)
    navigate('/', { replace: true })
  }

  return (
    <div className="pb-16">
      <header className="border-line sticky top-0 z-10 flex items-center gap-3 border-b bg-paper/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} aria-label="Zurück">
          <ChevronLeft size={24} className="text-ink-3" />
        </button>
        <h1 className="font-serif text-xl font-semibold tracking-tight">Buch</h1>
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
              {STATUS_LABEL[book.status]}
            </span>

            <div className="mt-auto flex justify-end gap-2 pt-3.5">
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label="Löschen"
                className="border-line text-ink-3 flex size-10 items-center justify-center rounded-xl border"
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
              <Link
                to={`/buch/${book.id}/bearbeiten`}
                aria-label="Bearbeiten"
                className="border-accent text-accent flex size-10 items-center justify-center rounded-xl border"
              >
                <Pencil size={18} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </div>

        <Row label="Zeitraum" value={formatRange(book.started_on, book.finished_on)} />
        <Row
          label="Dauer"
          value={days === null ? null : days === 0 ? 'an einem Tag' : `${days} Tage`}
        />
        <Row label="Seiten" value={book.page_count ? formatNumber(book.page_count) : null} />
        <Row
          label="Reihe"
          value={
            book.series
              ? book.series_volume
                ? `${book.series}, Band ${book.series_volume}`
                : book.series
              : null
          }
        />
        <Row label="Format" value={book.format ? FORMAT_LABEL[book.format] : null} />
        <Row label="Sprache" value={book.language ? languageLabel(book.language) : null} />
        <Row label="Herkunft" value={book.provenance ? PROVENANCE_LABEL[book.provenance] : null} />
        <Row label="Erschienen" value={book.published_year ? String(book.published_year) : null} />
        <Row label="ISBN" value={book.isbn} />

        <Blurb text={catalogue.entry?.text ?? null} asking={catalogue.asking} />

        {book.notes && (
          <div className="border-accent/35 mt-6 border-l-2 pl-4">
            <p className="text-ink-3 mb-1 text-xs font-bold tracking-widest uppercase">Notiz</p>
            <p className="font-serif text-sm leading-relaxed whitespace-pre-line italic">
              {book.notes}
            </p>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={confirming}
        title="Buch löschen?"
        description={`»${book.title}« wird endgültig entfernt. Das lässt sich nicht rückgängig machen.`}
        confirmLabel="Endgültig löschen"
        cancelLabel="Behalten"
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}
