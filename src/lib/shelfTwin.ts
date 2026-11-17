import { isbnThirteen } from './isbn'
import type { Book } from '../types'

interface Sought {
  title: string
  authors: string[]
  isbn: string | null
}

function plain(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function nameKey(name: string) {
  return plain(name).split(' ').filter(Boolean).sort().join(' ')
}

function shareAnAuthor(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return true
  const known = new Set(left.map(nameKey))
  return right.some((name) => known.has(nameKey(name)))
}

export function shelvedTwin(books: Book[], sought: Sought, ignoreId?: string) {
  const isbn = sought.isbn ? isbnThirteen(sought.isbn) : null
  const title = plain(sought.title)
  if (!isbn && !title) return null

  return (
    books.find((book) => {
      if (book.id === ignoreId) return false
      if (isbn && book.isbn && isbnThirteen(book.isbn) === isbn) return true
      return title !== '' && plain(book.title) === title && shareAnAuthor(book.authors, sought.authors)
    }) ?? null
  )
}
