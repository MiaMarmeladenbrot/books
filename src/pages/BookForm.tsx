import { useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { useBooks } from '../store/useBooks'
import { todayIso } from '../utils/format'
import {
  BookStatus,
  FORMAT_LABEL,
  FORMAT_ORDER,
  PROVENANCE_LABEL,
  PROVENANCE_ORDER,
  STATUS_LABEL,
  STATUS_ORDER,
} from '../types'
import type { BookDraft, BookFormat, BookProvenance } from '../types'

const EMPTY: BookDraft = {
  title: '',
  subtitle: null,
  authors: [],
  series: null,
  series_volume: null,
  isbn: null,
  published_year: null,
  page_count: null,
  format: null,
  provenance: null,
  status: BookStatus.Read,
  started_on: null,
  finished_on: null,
  acquired_on: null,
  rating: null,
  notes: null,
  cover_path: null,
  source_meta: {},
}

function textOrNull(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function numberOrNull(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const fieldClass =
  'border-line bg-card focus:border-accent w-full rounded-xl border px-3.5 py-3 text-base outline-none'
const labelClass = 'text-ink-2 mb-1.5 block text-xs font-semibold'

export function BookForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { books, addBook, updateBook, loading } = useBooks()

  const existing = useMemo(() => books.find((book) => book.id === id), [books, id])
  const isEdit = Boolean(id)
  const cameFromDetail = useLocation().key !== 'default'

  const [draft, setDraft] = useState<BookDraft>(() => {
    if (existing) {
      const {
        id: _id,
        user_id: _userId,
        created_at: _created,
        updated_at: _updated,
        ...rest
      } = existing
      return rest
    }
    return { ...EMPTY, finished_on: todayIso(), started_on: todayIso() }
  })
  const [authorText, setAuthorText] = useState(() => (existing?.authors ?? []).join(', '))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isEdit && !existing) {
    return (
      <p className="text-ink-2 px-4 py-20 text-center text-sm">
        {loading ? 'Lädt…' : 'Buch nicht gefunden.'}
      </p>
    )
  }

  const patch = (changes: Partial<BookDraft>) => setDraft((current) => ({ ...current, ...changes }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!draft.title.trim()) {
      setError('Ohne Titel geht es nicht.')
      return
    }
    setBusy(true)
    const authors = authorText
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
    try {
      const payload = {
        ...draft,
        title: draft.title.trim(),
        authors,
        subtitle: textOrNull(draft.subtitle ?? ''),
        isbn: textOrNull(draft.isbn ?? ''),
        series: textOrNull(draft.series ?? ''),
        notes: textOrNull(draft.notes ?? ''),
      }
      const saved = existing ? await updateBook(existing.id, payload) : await addBook(payload)
      if (existing && cameFromDetail) navigate(-1)
      else navigate(`/buch/${saved.id}`, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Speichern fehlgeschlagen.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="pb-16">
      <header className="border-line sticky top-0 z-10 flex items-center gap-3 border-b bg-paper/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} aria-label="Abbrechen">
          <X size={22} className="text-ink-3" />
        </button>
        <h1 className="font-serif text-xl font-semibold tracking-tight">
          {existing ? 'Buch bearbeiten' : 'Neues Buch'}
        </h1>
        <button
          type="submit"
          disabled={busy}
          className="text-accent ml-auto text-[15px] font-bold disabled:opacity-50"
        >
          {busy ? 'Sichert…' : 'Sichern'}
        </button>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-5">
        {error && <p className="text-danger mb-4 text-sm">{error}</p>}

        <label className="mb-4 block">
          <span className={labelClass}>Titel</span>
          <input
            value={draft.title}
            onChange={(event) => patch({ title: event.target.value })}
            autoFocus={!existing}
            className={fieldClass}
          />
        </label>

        <label className="mb-4 block">
          <span className={labelClass}>Autorin oder Autor</span>
          <input
            value={authorText}
            onChange={(event) => setAuthorText(event.target.value)}
            placeholder="Mehrere mit Komma trennen"
            className={fieldClass}
          />
        </label>

        <div className="mb-4">
          <span className={labelClass}>Status</span>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={draft.status === status}
                onClick={() => patch({ status })}
                className={`rounded-xl border py-3 text-sm font-medium ${
                  draft.status === status
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line bg-card text-ink-2'
                }`}
              >
                {STATUS_LABEL[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>Gelesen von</span>
            <input
              type="date"
              value={draft.started_on ?? ''}
              onChange={(event) => patch({ started_on: textOrNull(event.target.value) })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>bis</span>
            <input
              type="date"
              value={draft.finished_on ?? ''}
              onChange={(event) => patch({ finished_on: textOrNull(event.target.value) })}
              className={fieldClass}
            />
          </label>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>Format</span>
            <select
              value={draft.format ?? ''}
              onChange={(event) =>
                patch({ format: textOrNull(event.target.value) as BookFormat | null })
              }
              className={fieldClass}
            >
              <option value="">—</option>
              {FORMAT_ORDER.map((format) => (
                <option key={format} value={format}>
                  {FORMAT_LABEL[format]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Seiten</span>
            <input
              inputMode="numeric"
              value={draft.page_count ?? ''}
              onChange={(event) => patch({ page_count: numberOrNull(event.target.value) })}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="mb-4 block">
          <span className={labelClass}>Erhalten als</span>
          <select
            value={draft.provenance ?? ''}
            onChange={(event) =>
              patch({ provenance: textOrNull(event.target.value) as BookProvenance | null })
            }
            className={fieldClass}
          >
            <option value="">—</option>
            {PROVENANCE_ORDER.map((source) => (
              <option key={source} value={source}>
                {PROVENANCE_LABEL[source]}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-4 block">
          <span className={labelClass}>ISBN</span>
          <input
            inputMode="numeric"
            value={draft.isbn ?? ''}
            onChange={(event) => patch({ isbn: event.target.value })}
            placeholder="978…"
            className={fieldClass}
          />
        </label>

        <div className="mb-4 grid grid-cols-[1fr_5rem] gap-3">
          <label className="block">
            <span className={labelClass}>Reihe</span>
            <input
              value={draft.series ?? ''}
              onChange={(event) => patch({ series: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Band</span>
            <input
              inputMode="numeric"
              value={draft.series_volume ?? ''}
              onChange={(event) => patch({ series_volume: numberOrNull(event.target.value) })}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="mb-4 block">
          <span className={labelClass}>Notiz</span>
          <textarea
            rows={3}
            value={draft.notes ?? ''}
            onChange={(event) => patch({ notes: event.target.value })}
            placeholder="Ein Satz für später…"
            className={`${fieldClass} resize-none`}
          />
        </label>
      </div>
    </form>
  )
}
