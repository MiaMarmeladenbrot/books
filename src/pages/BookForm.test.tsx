import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { InitialEntry } from 'react-router-dom'
import { BookForm } from './BookForm'
import { BooksContext } from '../store/booksContextValue'
import { aBook } from '../test-books'
import { BookFormat, BookProvenance, BookStatus } from '../types'
import type { Book, BookDraft } from '../types'
import type { Candidate } from '../lib/lookup'

type AddBook = Mock<(draft: BookDraft) => Promise<Book>>
type UpdateBook = Mock<(id: string, patch: Partial<BookDraft>) => Promise<Book>>

vi.mock('../lib/supabase', () => ({
  coverUrl: () => null,
  uploadCover: vi.fn().mockResolvedValue('cover/pfad.jpg'),
  releaseCover: vi.fn().mockResolvedValue(undefined),
}))

const TODAY = '2026-09-16'

interface Opened {
  books?: Book[]
  at?: InitialEntry
  saved?: Book
  addBook?: AddBook
  updateBook?: UpdateBook
}

function form({ books = [], at = '/buch/neu', saved, addBook, updateBook }: Opened = {}) {
  const book = saved ?? aBook({ id: 'b-neu' })
  const value = {
    books,
    loading: false,
    error: null,
    addBook: addBook ?? (vi.fn(async () => book) as AddBook),
    updateBook: updateBook ?? (vi.fn(async () => book) as UpdateBook),
    removeBook: vi.fn(),
    reload: vi.fn().mockResolvedValue(undefined),
  }

  render(
    <MemoryRouter initialEntries={[at]}>
      <BooksContext.Provider value={value}>
        <Routes>
          <Route path="/buch/neu" element={<BookForm />} />
          <Route path="/buch/:id/bearbeiten" element={<BookForm />} />
          <Route path="/buch/:id" element={<p>Buchseite</p>} />
          <Route path="/buch/suchen" element={<p>Suche</p>} />
        </Routes>
      </BooksContext.Provider>
    </MemoryRouter>
  )

  return value
}

function fill(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function save() {
  fireEvent.click(screen.getByRole('button', { name: 'Sichern' }))
}

const PREFILL: Candidate = {
  title: 'Tschick',
  subtitle: 'Roman',
  authors: ['Wolfgang Herrndorf'],
  series: null,
  series_volume: null,
  isbn: '9783499256356',
  published_year: 2012,
  page_count: 253,
  publisher: 'Rowohlt-Taschenbuch-Verl.',
  language: 'de',
  format: BookFormat.Paperback,
  cover_url: '/api/cover?isbn=9783499256356',
  source: 'DNB',
}

function pretendToday() {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(`${TODAY}T09:00:00`))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('filling the form in', () => {
  it('arrives with what the catalogue found already written in', () => {
    form({ at: { pathname: '/buch/neu', state: { prefill: PREFILL } } })

    expect(screen.getByLabelText('Titel')).toHaveValue('Tschick')
    expect(screen.getByLabelText(/^Untertitel/)).toHaveValue('Roman')
    expect(screen.getByLabelText('Autorin oder Autor')).toHaveValue('Wolfgang Herrndorf')
    expect(screen.getByLabelText('ISBN')).toHaveValue('9783499256356')
    expect(screen.getByLabelText('Seiten')).toHaveValue('253')
    expect(screen.getByLabelText('Erschienen')).toHaveValue('2012')
    expect(screen.getByLabelText('Sprache')).toHaveValue('de')
    expect(screen.getByLabelText('Format')).toHaveValue(BookFormat.Paperback)
  })

  it('keeps only a title as the one thing it insists on', async () => {
    const { addBook } = form()

    save()

    expect(await screen.findByText('Ohne Titel geht es nicht.')).toBeInTheDocument()
    expect(addBook).not.toHaveBeenCalled()
  })

  it('hands a whole book to the shelf and steps aside to its page', async () => {
    const { addBook } = form({ at: { pathname: '/buch/neu', state: { prefill: PREFILL } } })

    fill('Autorin oder Autor', ' Wolfgang Herrndorf , Maik Klingenberg ')
    fill('Reihe', 'Klassenfahrt')
    fill('Band', '2,5')
    fill('Notiz', '  ')
    save()

    await waitFor(() => expect(addBook).toHaveBeenCalledOnce())
    expect(addBook.mock.calls[0][0]).toMatchObject({
      title: 'Tschick',
      subtitle: 'Roman',
      authors: ['Wolfgang Herrndorf', 'Maik Klingenberg'],
      series: 'Klassenfahrt',
      series_volume: 2.5,
      isbn: '9783499256356',
      page_count: 253,
      notes: null,
      status: BookStatus.WantToRead,
      source_meta: { lookup: 'DNB', publisher: 'Rowohlt-Taschenbuch-Verl.' },
    })
    expect(await screen.findByText('Buchseite')).toBeInTheDocument()
  })

  it('dates a book the moment it is called started', () => {
    pretendToday()
    form()

    fireEvent.click(screen.getByRole('button', { name: 'Mittendrin' }))

    expect(screen.getByLabelText('Angefangen am')).toHaveValue(TODAY)
    expect(screen.queryByLabelText('bis')).not.toBeInTheDocument()
  })

  it('dates both ends the moment it is called finished', () => {
    pretendToday()
    form()

    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))

    expect(screen.getByLabelText('Gelesen von')).toHaveValue(TODAY)
    expect(screen.getByLabelText('bis')).toHaveValue(TODAY)
  })

  it('drags the finish date along until someone sets one by hand', () => {
    form()

    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))
    fill('Gelesen von', '2026-09-01')
    expect(screen.getByLabelText('bis')).toHaveValue('2026-09-01')

    fill('bis', '2026-09-13')
    fill('Gelesen von', '2026-08-20')
    expect(screen.getByLabelText('bis')).toHaveValue('2026-09-13')
  })

  it('forgets the dates again when the book goes back on the someday pile', () => {
    form()

    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))
    fireEvent.click(screen.getByRole('button', { name: 'Irgendwann' }))

    expect(screen.queryByLabelText('Gelesen von')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('bis')).not.toBeInTheDocument()
  })
})

describe('editing a book that is already on the shelf', () => {
  const SHELVED = aBook({
    id: 'b-alt',
    title: 'Tschick',
    authors: ['Wolfgang Herrndorf'],
    series: 'Rororo',
    series_volume: 3,
    provenance: BookProvenance.Gift,
    notes: 'zweimal gelesen',
  })

  it('opens with the book in it', () => {
    form({ books: [SHELVED], at: '/buch/b-alt/bearbeiten' })

    expect(screen.getByRole('heading', { name: 'Buch bearbeiten' })).toBeInTheDocument()
    expect(screen.getByLabelText('Titel')).toHaveValue('Tschick')
    expect(screen.getByLabelText('Reihe')).toHaveValue('Rororo')
    expect(screen.getByLabelText('Band')).toHaveValue('3')
    expect(screen.getByLabelText('Notiz')).toHaveValue('zweimal gelesen')
  })

  it('writes the changes back to the same book', async () => {
    const updateBook = vi.fn(async () => SHELVED) as UpdateBook
    form({ books: [SHELVED], at: '/buch/b-alt/bearbeiten', updateBook })

    fill('Titel', 'Tschick  ')
    fill('Notiz', 'dreimal gelesen')
    save()

    await waitFor(() => expect(updateBook).toHaveBeenCalled())
    expect(updateBook.mock.calls[0][0]).toBe('b-alt')
    expect(updateBook.mock.calls[0][1]).toMatchObject({
      title: 'Tschick',
      notes: 'dreimal gelesen',
      series_volume: 3,
    })
  })

  it('says so when the book behind the address is gone', () => {
    form({ books: [], at: '/buch/weg/bearbeiten' })

    expect(screen.getByText('Buch nicht gefunden.')).toBeInTheDocument()
  })

  it('keeps the form open and says why when saving fails', async () => {
    const updateBook = vi.fn(async (): Promise<Book> => {
      throw new Error('Zeile ist gesperrt')
    }) as UpdateBook
    form({ books: [SHELVED], at: '/buch/b-alt/bearbeiten', updateBook })

    save()

    expect(await screen.findByText('Zeile ist gesperrt')).toBeInTheDocument()
    expect(screen.getByLabelText('Titel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sichern' })).toBeEnabled()
  })

  it('holds on to a language no list of ours knows', () => {
    form({ books: [aBook({ id: 'b-geo', language: 'geo' })], at: '/buch/b-geo/bearbeiten' })

    expect(screen.getByLabelText('Sprache')).toHaveValue('geo')
    expect(screen.getByRole('option', { name: 'GEO' })).toBeInTheDocument()
  })
})
