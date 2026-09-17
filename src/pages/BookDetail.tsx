import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Gem } from 'lucide-react'
import { useBooks } from '../store/useBooks'
import { useRecommendations } from '../store/useRecommendations'
import { Cover } from '../components/Cover'
import { coverUrl } from '../lib/supabase'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatNumber, formatRange, readingDays } from '../utils/format'
import {
  BookStatus,
  FORMAT_LABEL,
  NOTE_LIMIT,
  PROVENANCE_LABEL,
  STATUS_LABEL,
  languageLabel,
} from '../types'
import type { Book } from '../types'

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="border-line text-ink-2 flex justify-between gap-6 border-b py-2.5 text-sm last:border-b-0">
      <span className="shrink-0">{label}</span>
      <b className="text-ink text-right font-semibold text-balance">{value}</b>
    </div>
  )
}

const RECOMMENDABLE: BookStatus[] = [BookStatus.Read, BookStatus.Reading]

function RecommendDialog({ book, onClose }: { book: Book; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { recommend } = useRecommendations()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState('')

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault()
    setFailed('')
    setBusy(true)
    try {
      await recommend(book, note.trim() === '' ? null : note.trim())
      onClose()
    } catch {
      setFailed('Das hat nicht geklappt.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="bg-card m-auto w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl p-6 shadow-[0_24px_50px_-20px_rgb(30_26_21/0.55)] backdrop:bg-ink/30 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit}>
        <h2 className="font-serif mb-2 text-xl font-semibold tracking-tight">Empfehlen</h2>
        <p className="text-ink-2 mb-4 text-sm leading-relaxed">
          Dir hat »{book.title}« gefallen? Dann empfiehl es doch gerne anderen Leser:innen.
        </p>

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={NOTE_LIMIT}
          rows={3}
          autoFocus
          placeholder="Warum mochtest du dieses Buch? Wem könnte es ebenfalls gefallen?"
          aria-label="Ein Satz zur Empfehlung"
          className="border-line bg-paper focus:border-accent w-full resize-none rounded-xl border px-3.5 py-3 text-base outline-none"
        />
        <p className="text-ink-3 mt-1 mb-5 text-right text-xs">{NOTE_LIMIT - note.length}</p>

        {failed && <p className="text-danger mb-3 text-sm">{failed}</p>}

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={busy}
            className="bg-accent rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Sendet…' : 'Empfehlen'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border-line text-ink rounded-xl border py-3.5 text-sm font-semibold"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </dialog>
  )
}

export function BookDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { books, removeBook } = useBooks()
  const { mine, withdraw } = useRecommendations()
  const [confirming, setConfirming] = useState(false)
  const [recommending, setRecommending] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawFailed, setWithdrawFailed] = useState('')

  const book = books.find((entry) => entry.id === id)

  if (!book) {
    return <p className="text-ink-2 px-4 py-20 text-center text-sm">Buch nicht gefunden.</p>
  }

  const days = readingDays(book.started_on, book.finished_on)
  const recommended = mine.find((entry) => entry.book_id === book.id) ?? null
  const canRecommend = RECOMMENDABLE.includes(book.status)

  const handleDelete = async () => {
    await removeBook(book.id)
    navigate('/', { replace: true })
  }

  const handleWithdraw = async () => {
    if (!recommended) return
    setWithdrawing(false)
    setWithdrawFailed('')
    try {
      await withdraw(recommended.id)
    } catch {
      setWithdrawFailed('Das hat nicht geklappt.')
    }
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
        <div className="mb-5 flex gap-4">
          <div className="w-29 shrink-0">
            <Cover title={book.title} authors={book.authors} src={coverUrl(book.cover_path)} />
          </div>
          <div className="min-w-0 grow">
            <h2 className="font-serif text-xl leading-tight font-semibold tracking-tight">
              {book.title}
            </h2>
            {book.subtitle && <p className="text-ink-2 mt-1 text-sm">{book.subtitle}</p>}
            <p className="text-ink-2 mt-1 text-sm">{book.authors.join(', ')}</p>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <span className="bg-accent-soft text-accent rounded-full px-2.5 py-1 text-xs font-semibold">
                {STATUS_LABEL[book.status]}
              </span>

              {canRecommend &&
                (recommended ? (
                  <button
                    type="button"
                    onClick={() => setWithdrawing(true)}
                    aria-label="Empfohlen — zurücknehmen"
                    className="bg-gold border-gold flex size-11 shrink-0 items-center justify-center rounded-xl border"
                  >
                    <Gem size={22} strokeWidth={2} className="text-paper" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRecommending(true)}
                    aria-label="Empfehlen"
                    className="border-gold flex size-11 shrink-0 items-center justify-center rounded-xl border"
                  >
                    <Gem size={22} strokeWidth={2} className="text-gold" />
                  </button>
                ))}
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
        <Row
          label="Erhalten als"
          value={book.provenance ? PROVENANCE_LABEL[book.provenance] : null}
        />
        <Row label="Erschienen" value={book.published_year ? String(book.published_year) : null} />
        <Row label="ISBN" value={book.isbn} />

        {book.notes && (
          <div className="border-accent/35 mt-6 border-l-2 pl-4">
            <p className="text-ink-3 mb-1 text-xs font-bold tracking-widest uppercase">Notiz</p>
            <p className="font-serif text-sm leading-relaxed whitespace-pre-line italic">
              {book.notes}
            </p>
          </div>
        )}

        {withdrawFailed && <p className="text-danger mt-6 text-sm">{withdrawFailed}</p>}

        <div className="mt-8 flex flex-col">
          <Link
            to={`/buch/${book.id}/bearbeiten`}
            className="bg-accent w-full rounded-xl py-3.5 text-center text-sm font-bold text-white"
          >
            Bearbeiten
          </Link>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-ink-3 mt-2 self-center px-4 py-2 text-sm font-medium"
          >
            Löschen
          </button>
        </div>
      </main>

      {recommending && <RecommendDialog book={book} onClose={() => setRecommending(false)} />}

      <ConfirmDialog
        open={withdrawing}
        title="Empfehlung zurücknehmen?"
        description={`»${book.title}« verschwindet aus den Empfehlungen der anderen.`}
        confirmLabel="Zurücknehmen"
        cancelLabel="Stehen lassen"
        onConfirm={handleWithdraw}
        onCancel={() => setWithdrawing(false)}
      />

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
