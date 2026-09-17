import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentProps } from 'react'
import type { User } from '@supabase/auth-js'
import { Feed } from './Feed'
import { AuthContext } from '../store/authContextValue'
import { BooksContext } from '../store/booksContextValue'
import { RecommendationsContext } from '../store/recommendationsContextValue'
import { aBook, aFeedEntry } from '../test-books'
import { BookStatus } from '../types'
import type { Book, FeedEntry } from '../types'

vi.mock('../lib/supabase', () => ({
  coverUrl: (path: string | null) => (path ? `https://bilder.test/${path}` : null),
  sharedCoverPath: (isbn: string) => (/^\d{13}$/.test(isbn) ? `isbn/${isbn}.jpg` : null),
}))

const READER = { id: 'u1' } as unknown as User

type Recommended = ComponentProps<typeof RecommendationsContext.Provider>['value']

interface Opened {
  feed?: FeedEntry[] | null
  books?: Book[]
  loadingFeed?: boolean
  error?: string | null
}

function open({ feed = [], books = [], loadingFeed = false, error = null }: Opened = {}) {
  const addBook = vi.fn().mockResolvedValue(aBook())
  const loadFeed = vi.fn().mockResolvedValue(undefined)
  const withdraw = vi.fn().mockResolvedValue(undefined)

  const account = { user: READER, loading: false } as unknown as ComponentProps<
    typeof AuthContext.Provider
  >['value']
  const shelf = {
    books,
    loading: false,
    error: null,
    addBook,
    updateBook: vi.fn(),
    removeBook: vi.fn(),
    reload: vi.fn(),
  }
  const feedValue = {
    mine: [],
    feed,
    loadingFeed,
    error,
    loadFeed,
    recommend: vi.fn(),
    withdraw,
  } as unknown as Recommended

  render(
    <MemoryRouter>
      <AuthContext.Provider value={account}>
        <BooksContext.Provider value={shelf}>
          <RecommendationsContext.Provider value={feedValue}>
            <Feed />
          </RecommendationsContext.Provider>
        </BooksContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  )

  return { addBook, loadFeed }
}

describe('Feed', () => {
  it('asks for the feed as soon as it opens', () => {
    const { loadFeed } = open()

    expect(loadFeed).toHaveBeenCalled()
  })

  it('names who recommended a book and what they wrote', () => {
    open({
      feed: [
        aFeedEntry({
          user_id: 'u2',
          title: 'Mr. Saitos reisendes Kino',
          authors: ['Annette Bjergfeldt'],
          note: 'witzig. traurig. schön nordisch.',
        }),
      ],
    })

    expect(screen.getByText('Mr. Saitos reisendes Kino')).toBeInTheDocument()
    expect(screen.getByText('Annette Bjergfeldt')).toBeInTheDocument()
    expect(screen.getByText('Sinja')).toBeInTheDocument()
    expect(screen.getByText('witzig. traurig. schön nordisch.')).toBeInTheDocument()
  })

  it('says Du on your own card instead of your name', () => {
    open({ feed: [aFeedEntry({ user_id: 'u1' })] })

    expect(screen.getByText('Du')).toBeInTheDocument()
  })

  it('falls back to a placeholder for a reader without a name', () => {
    open({ feed: [aFeedEntry({ user_id: 'u2', profiles: { display_name: null, avatar: null } })] })

    expect(screen.getByText('Ohne Namen')).toBeInTheDocument()
  })

  it('offers the stack for a book that is not on the shelf', () => {
    open({ feed: [aFeedEntry({ user_id: 'u2' })] })

    expect(screen.getByRole('button', { name: 'Auf meinen Stapel legen' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Meine Ausgabe anzeigen' })).not.toBeInTheDocument()
  })

  it('hands the shelf a someday book with the shared cover when the stack is pressed', () => {
    const { addBook } = open({
      feed: [
        aFeedEntry({
          user_id: 'u2',
          title: 'Tschick',
          authors: ['Wolfgang Herrndorf'],
          isbn: '9783499256356',
        }),
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Auf meinen Stapel legen' }))

    expect(addBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tschick',
        authors: ['Wolfgang Herrndorf'],
        isbn: '9783499256356',
        status: BookStatus.WantToRead,
        cover_path: 'isbn/9783499256356.jpg',
      }),
    )
  })

  it('leaves the cover empty when the recommendation carries no usable number', () => {
    const { addBook } = open({ feed: [aFeedEntry({ user_id: 'u2', isbn: 'unbekannt' })] })

    fireEvent.click(screen.getByRole('button', { name: 'Auf meinen Stapel legen' }))

    expect(addBook).toHaveBeenCalledWith(expect.objectContaining({ cover_path: null }))
  })

  it('points at your own copy once the book is on the shelf', () => {
    const mine = aBook({ id: 'b99', title: 'Tschick', authors: ['Wolfgang Herrndorf'] })
    open({
      books: [mine],
      feed: [aFeedEntry({ user_id: 'u2', title: 'Tschick', authors: ['Wolfgang Herrndorf'] })],
    })

    const link = screen.getByRole('link', { name: 'Meine Ausgabe anzeigen' })
    expect(link).toHaveAttribute('href', '/buch/b99')
    expect(screen.queryByRole('button', { name: 'Auf meinen Stapel legen' })).not.toBeInTheDocument()
  })

  it('shows the same one button on your own card, never a way to take it back', () => {
    const mine = aBook({ id: 'b7', title: 'Tschick', authors: ['Wolfgang Herrndorf'] })
    open({
      books: [mine],
      feed: [aFeedEntry({ user_id: 'u1', title: 'Tschick', authors: ['Wolfgang Herrndorf'] })],
    })

    expect(screen.getByRole('link', { name: 'Meine Ausgabe anzeigen' })).toHaveAttribute(
      'href',
      '/buch/b7',
    )
    expect(screen.queryByText('Zurücknehmen')).not.toBeInTheDocument()
  })

  it('says that nobody has recommended anything yet', () => {
    open({ feed: [] })

    expect(screen.getByText(/Noch hat niemand etwas empfohlen/)).toBeInTheDocument()
  })

  it('shows a refusal rather than an endless wait', () => {
    open({ feed: null, error: 'permission denied for table recommendations' })

    expect(screen.getByText('permission denied for table recommendations')).toBeInTheDocument()
    expect(screen.queryByText('Lädt…')).not.toBeInTheDocument()
  })

  it('waits visibly while the feed is on its way', () => {
    open({ feed: null, loadingFeed: true })

    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })
})
