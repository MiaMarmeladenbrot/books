import type { Book, Recommendation } from '../types'

function compactIsbn(value: string | null) {
  if (!value) return null
  const compact = value.replace(/[^0-9Xx]/g, '').toUpperCase()
  return compact.length === 10 || compact.length === 13 ? compact : null
}

function shelfKey(title: string, authors: string[]) {
  return [title, ...authors]
    .join(' ')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function findOnShelf(books: Book[], entry: Recommendation) {
  const isbn = compactIsbn(entry.isbn)
  const key = shelfKey(entry.title, entry.authors)
  return (
    books.find((book) => {
      const ownIsbn = compactIsbn(book.isbn)
      if (isbn && ownIsbn && ownIsbn === isbn) return true
      return shelfKey(book.title, book.authors) === key
    }) ?? null
  )
}
