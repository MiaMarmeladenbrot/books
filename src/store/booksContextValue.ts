import { createContext } from 'react'
import type { Book, BookDraft } from '../types'

interface BooksValue {
  books: Book[]
  loading: boolean
  error: string | null
  addBook: (draft: BookDraft) => Promise<Book>
  updateBook: (id: string, patch: Partial<BookDraft>) => Promise<Book>
  removeBook: (id: string) => Promise<void>
  reload: () => Promise<void>
}

export const BooksContext = createContext<BooksValue | null>(null)
