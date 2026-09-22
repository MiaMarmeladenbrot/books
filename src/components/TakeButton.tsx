import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sharedCoverPath } from '../lib/supabase'
import { useBooks } from '../store/useBooks'
import { findOnShelf } from '../utils/shelf'
import { BookStatus, EMPTY_DRAFT } from '../types'
import type { Recommendation } from '../types'

export function TakeButton({ entry }: { entry: Recommendation }) {
  const { books, addBook } = useBooks()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState('')

  const onShelf = findOnShelf(books, entry)

  const take = async () => {
    setFailed('')
    setBusy(true)
    try {
      await addBook({
        ...EMPTY_DRAFT,
        title: entry.title,
        authors: entry.authors,
        isbn: entry.isbn,
        status: BookStatus.WantToRead,
        cover_path: entry.isbn ? sharedCoverPath(entry.isbn) : null,
      })
    } catch {
      setFailed('Das hat nicht geklappt.')
    }
    setBusy(false)
  }

  return (
    <div className="mt-3.5">
      <div className="flex justify-end">
        {onShelf ? (
          <Link
            to={`/buch/${onShelf.id}`}
            className="border-line text-ink-2 shrink-0 rounded-xl border px-3.5 py-2 text-xs font-bold"
          >
            Meine Ausgabe anzeigen
          </Link>
        ) : (
          <button
            type="button"
            onClick={take}
            disabled={busy}
            className="border-accent text-accent shrink-0 rounded-xl border px-3.5 py-2 text-xs font-bold disabled:opacity-50"
          >
            Auf meinen Stapel legen
          </button>
        )}
      </div>
      {failed && <p className="text-danger mt-2 text-right text-xs">{failed}</p>}
    </div>
  )
}
