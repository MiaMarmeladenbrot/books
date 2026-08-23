import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Book, BookDraft } from '../types'
import { BooksContext } from './booksContextValue'

const COLUMNS = '*'

function byRecency(a: Book, b: Book) {
  const left = a.finished_on ?? a.started_on ?? a.created_at
  const right = b.finished_on ?? b.started_on ?? b.created_at
  return right.localeCompare(left)
}

export function BooksProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('books')
      .select(COLUMNS)
      .order('finished_on', { ascending: false, nullsFirst: true })
    if (queryError) setError(queryError.message)
    else {
      setError(null)
      setBooks((data as Book[]).sort(byRecency))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const addBook = useCallback(async (draft: BookDraft) => {
    const { data, error: insertError } = await supabase
      .from('books')
      .insert(draft)
      .select(COLUMNS)
      .single()
    if (insertError) throw new Error(insertError.message)
    const created = data as Book
    setBooks((current) => [...current, created].sort(byRecency))
    return created
  }, [])

  const updateBook = useCallback(async (id: string, patch: Partial<BookDraft>) => {
    const { data, error: updateError } = await supabase
      .from('books')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .single()
    if (updateError) throw new Error(updateError.message)
    const saved = data as Book
    setBooks((current) => current.map((book) => (book.id === id ? saved : book)).sort(byRecency))
    return saved
  }, [])

  const removeBook = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('books').delete().eq('id', id)
    if (deleteError) throw new Error(deleteError.message)
    setBooks((current) => current.filter((book) => book.id !== id))
  }, [])

  return (
    <BooksContext.Provider
      value={{ books, loading, error, addBook, updateBook, removeBook, reload }}
    >
      {children}
    </BooksContext.Provider>
  )
}
