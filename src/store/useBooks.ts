import { useContext } from 'react'
import { BooksContext } from './booksContextValue'

export function useBooks() {
  const value = useContext(BooksContext)
  if (!value) throw new Error('useBooks braucht einen BooksProvider')
  return value
}
