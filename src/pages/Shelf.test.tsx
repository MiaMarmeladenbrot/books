import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentProps } from 'react'
import { Shelf } from './Shelf'
import { BooksContext } from '../store/booksContextValue'
import { RecommendationsContext } from '../store/recommendationsContextValue'
import { aBook, aRecommendation } from '../test-books'
import { BookStatus } from '../types'
import type { Book, Recommendation } from '../types'

vi.mock('../lib/supabase', () => ({
  coverUrl: (path: string | null) => (path ? `https://bucket.test/${path}` : null),
  sharedCoverPath: (isbn: string) => `isbn/${isbn}.jpg`,
}))

interface Shelved {
  books?: Book[]
  loading?: boolean
  error?: string | null
  reload?: () => Promise<void>
  at?: string
  mine?: Recommendation[]
}

function shelf({ books = [], loading = false, error = null, reload, at = '/', mine = [] }: Shelved) {
  const value = {
    books,
    loading,
    error,
    addBook: vi.fn(),
    updateBook: vi.fn(),
    removeBook: vi.fn(),
    reload: reload ?? vi.fn().mockResolvedValue(undefined),
  }

  const recommendations = {
    mine,
    feed: null,
    loadingFeed: false,
    error: null,
    loadFeed: vi.fn(),
    recommend: vi.fn(),
    withdraw: vi.fn(),
  } as unknown as ComponentProps<typeof RecommendationsContext.Provider>['value']

  render(
    <MemoryRouter initialEntries={[at]}>
      <BooksContext.Provider value={value}>
        <RecommendationsContext.Provider value={recommendations}>
          <Shelf />
        </RecommendationsContext.Provider>
      </BooksContext.Provider>
    </MemoryRouter>,
  )

  return value
}

function search(text: string) {
  fireEvent.change(screen.getByLabelText('Regal nach Titel oder Autor:in durchstöbern'), {
    target: { value: text },
  })
}

function titles() {
  return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
}

const NOVEMBER = aBook({ title: 'Der Wisent', finished_on: '2026-11-02', isbn: '9783446269149' })
const SEPTEMBER = aBook({ title: 'Tschick', authors: ['Wolfgang Herrndorf'] })
const ALSO_SEPTEMBER = aBook({ title: 'Slags', authors: ['Emma Jane Unsworth'] })

describe('the shelf as it stands', () => {
  it('counts the books it shows', () => {
    shelf({ books: [NOVEMBER, SEPTEMBER, ALSO_SEPTEMBER] })

    expect(screen.getByText('3 Bücher')).toBeInTheDocument()
    expect(titles()).toEqual(['Der Wisent', 'Tschick', 'Slags'])
  })

  it('gathers the books under the month they were finished', () => {
    shelf({ books: [NOVEMBER, SEPTEMBER, ALSO_SEPTEMBER] })

    const months = screen.getAllByRole('heading', { level: 2 })
    expect(months.map((heading) => heading.children[0].textContent)).toEqual([
      'November 2026',
      'September 2026',
    ])
    expect(months.map((heading) => heading.children[1].textContent)).toEqual(['1', '2'])
  })

  it('puts a book with no date of its own at the end, under Ohne Datum', () => {
    const undated = aBook({
      title: 'Wunsch',
      status: BookStatus.WantToRead,
      started_on: null,
      finished_on: null,
    })
    shelf({ books: [SEPTEMBER, undated] })

    const last = screen.getAllByRole('heading', { level: 2 }).at(-1)
    expect(last).toHaveTextContent('Ohne Datum')
    expect(
      within(last!.closest('section')!).getByRole('heading', { level: 3, name: 'Wunsch' }),
    ).toBeInTheDocument()
  })

  it('says how many of how many are left once something is typed', () => {
    shelf({ books: [NOVEMBER, SEPTEMBER, ALSO_SEPTEMBER] })

    search('wisent')

    expect(titles()).toEqual(['Der Wisent'])
    expect(screen.getByText('1 von 3')).toBeInTheDocument()
  })

  it('searches the author and the series, not only the title', () => {
    const inSeries = aBook({
      title: 'Eragon',
      authors: ['Christopher Paolini'],
      series: 'Eragon-Saga',
    })
    shelf({ books: [SEPTEMBER, inSeries] })

    search('herrndorf')
    expect(titles()).toEqual(['Tschick'])

    search('saga')
    expect(titles()).toEqual(['Eragon'])
  })

  it('finds a decomposed umlaut when a composed one is typed, and shows it as it was stored', () => {
    const decomposed = aBook({ title: 'Wüstenblume', authors: ['Waris Dirie'] })
    shelf({ books: [decomposed, SEPTEMBER] })

    search('Wüstenblume')

    expect(titles()).toHaveLength(1)
    expect(titles()[0]).toBe('Wüstenblume')
    expect(titles()[0]?.normalize('NFC')).toBe('Wüstenblume')
  })

  it('narrows to a stack and hands back a way out', () => {
    const reading = aBook({ title: 'Mittendrin', status: BookStatus.Reading, finished_on: null })
    shelf({ books: [reading, SEPTEMBER] })

    fireEvent.change(screen.getByLabelText('Stapel'), { target: { value: BookStatus.Reading } })
    expect(titles()).toEqual(['Mittendrin'])

    fireEvent.click(screen.getByLabelText('Mittendrin entfernen'))
    expect(titles()).toEqual(['Mittendrin', 'Tschick'])
  })

  it('lets a filter and a search narrow together', () => {
    const reading = aBook({ title: 'Tschick', status: BookStatus.Reading, finished_on: null })
    shelf({ books: [reading, SEPTEMBER] })

    fireEvent.change(screen.getByLabelText('Stapel'), { target: { value: BookStatus.Reading } })
    search('tschick')

    expect(titles()).toEqual(['Tschick'])
    expect(screen.getByText('1 von 2')).toBeInTheDocument()
  })

  it('reads the filter out of the address it was opened with', () => {
    const reading = aBook({ title: 'Mittendrin', status: BookStatus.Reading, finished_on: null })
    shelf({ books: [reading, SEPTEMBER], at: `/?status=${BookStatus.Reading}` })

    expect(titles()).toEqual(['Mittendrin'])
  })

  it('says when the shelf itself is empty', () => {
    shelf({ books: [] })

    expect(screen.getByText('Noch keine Bücher')).toBeInTheDocument()
  })

  it('says something else when only the search came up empty', () => {
    shelf({ books: [SEPTEMBER] })

    search('gibt es nicht')

    expect(screen.getByText('Nichts gefunden')).toBeInTheDocument()
    expect(screen.queryByText('Noch keine Bücher')).not.toBeInTheDocument()
  })

  it('says when a reading book was started', () => {
    const reading = aBook({
      title: 'Mittendrin',
      status: BookStatus.Reading,
      started_on: '2026-09-13',
      finished_on: null,
    })
    shelf({ books: [reading] })

    expect(screen.getByText(/^seit /)).toBeInTheDocument()
  })

  it('seals the books you recommended, and only those', () => {
    const shared = aBook({ id: 'b1', title: 'Weitergereicht' })
    const kept = aBook({ id: 'b2', title: 'Für mich' })
    shelf({ books: [shared, kept], mine: [aRecommendation({ book_id: 'b1' })] })

    const seals = screen.getAllByRole('img', { name: 'Von dir empfohlen' })

    expect(seals).toHaveLength(1)
    expect(seals[0].closest('a')).toHaveAttribute('href', '/buch/b1')
  })

  it('offers another try when the books could not be loaded', async () => {
    const reload = vi.fn().mockResolvedValue(undefined)
    shelf({ books: [], error: 'Netzwerk weg', reload })

    expect(
      screen.getByText('Deine Bücher konnten nicht geladen werden. Sie sind sicher, keine Sorge.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Netzwerk weg')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Nochmal versuchen' }))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('says it is loading before the first books arrive', () => {
    shelf({ books: [], loading: true })

    expect(screen.getByText('lädt …')).toBeInTheDocument()
    expect(screen.queryByText('Noch keine Bücher')).not.toBeInTheDocument()
  })
})
