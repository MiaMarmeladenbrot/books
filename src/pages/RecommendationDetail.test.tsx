import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ComponentProps } from 'react'
import type { User } from '@supabase/auth-js'
import { RecommendationDetail } from './RecommendationDetail'
import { AuthContext } from '../store/authContextValue'
import { BooksContext } from '../store/booksContextValue'
import { RecommendationsContext } from '../store/recommendationsContextValue'
import { aBook, aFeedEntry } from '../test-books'
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
  at?: string
}

function open({ feed = [], books = [], loadingFeed = false, at = 'r1' }: Opened = {}) {
  const loadFeed = vi.fn().mockResolvedValue(undefined)

  const account = { user: READER, loading: false } as unknown as ComponentProps<
    typeof AuthContext.Provider
  >['value']
  const shelf = {
    books,
    loading: false,
    error: null,
    addBook: vi.fn().mockResolvedValue(aBook()),
    updateBook: vi.fn(),
    removeBook: vi.fn(),
    reload: vi.fn(),
  }
  const feedValue = {
    mine: [],
    feed,
    loadingFeed,
    error: null,
    loadFeed,
    recommend: vi.fn(),
    withdraw: vi.fn(),
  } as unknown as Recommended

  render(
    <MemoryRouter initialEntries={[`/empfehlung/${at}`]}>
      <AuthContext.Provider value={account}>
        <BooksContext.Provider value={shelf}>
          <RecommendationsContext.Provider value={feedValue}>
            <Routes>
              <Route path="empfehlung/:id" element={<RecommendationDetail />} />
            </Routes>
          </RecommendationsContext.Provider>
        </BooksContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  )

  return { loadFeed }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('weg', { status: 404 })))
})

describe('RecommendationDetail', () => {
  it('asks for the feed when it is opened cold', () => {
    const { loadFeed } = open({ feed: null, loadingFeed: true })

    expect(loadFeed).toHaveBeenCalled()
    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })

  it('shows the book, who recommended it and what they wrote', () => {
    open({
      feed: [
        aFeedEntry({
          id: 'r1',
          user_id: 'u2',
          title: 'Mr. Saitos reisendes Kino',
          authors: ['Annette Bjergfeldt'],
          note: 'witzig. traurig. schön nordisch.',
        }),
      ],
    })

    expect(screen.getByRole('heading', { name: 'Mr. Saitos reisendes Kino' })).toBeInTheDocument()
    expect(screen.getAllByText('Annette Bjergfeldt').length).toBeGreaterThan(0)
    expect(screen.getByText('Sinja')).toBeInTheDocument()
    expect(screen.getByText('Empfehlung', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('witzig. traurig. schön nordisch.')).toBeInTheDocument()
  })

  it('puts what the catalogue knows under the title', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            text: null,
            source: null,
            pages: 559,
            year: 2021,
            series: 'Winge und Cardell ermitteln',
            volume: 2,
          })
        )
      ),
    )

    open({ feed: [aFeedEntry({ id: 'r1', user_id: 'u2', isbn: '9783492317948' })] })

    expect(await screen.findByText('559 Seiten · 2021')).toBeInTheDocument()
    expect(
      screen.getByText('Band 2 von »Winge und Cardell ermitteln«'),
    ).toBeInTheDocument()
  })

  it('carries the same single button the card carries', () => {
    open({ feed: [aFeedEntry({ id: 'r1', user_id: 'u2' })] })

    expect(screen.getByRole('button', { name: 'Auf meinen Stapel legen' })).toBeInTheDocument()
  })

  it('points at your own copy when the book is already on the shelf', () => {
    open({
      feed: [aFeedEntry({ id: 'r1', user_id: 'u2', title: 'Tschick', authors: ['Wolfgang Herrndorf'] })],
      books: [aBook({ id: 'b9', title: 'Tschick', authors: ['Wolfgang Herrndorf'] })],
    })

    expect(screen.getByRole('link', { name: 'Meine Ausgabe anzeigen' })).toHaveAttribute(
      'href',
      '/buch/b9',
    )
  })

  it('says so when the recommendation has been taken back', () => {
    open({ feed: [aFeedEntry({ id: 'r2' })], at: 'r1' })

    expect(screen.getByText('Diese Empfehlung gibt es nicht mehr.')).toBeInTheDocument()
  })
})
