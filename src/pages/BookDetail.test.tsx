import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ComponentProps } from 'react'
import { BookDetail } from './BookDetail'
import { BooksContext } from '../store/booksContextValue'
import { RecommendationsContext } from '../store/recommendationsContextValue'
import { aBook, aRecommendation } from '../test-books'
import { BookStatus } from '../types'
import type { Book, Recommendation } from '../types'

vi.mock('../lib/supabase', () => ({ coverUrl: () => null }))

type Recommended = ComponentProps<typeof RecommendationsContext.Provider>['value']

function open(book: Book, mine: Recommendation[] = []) {
  const recommend = vi.fn().mockResolvedValue(aRecommendation())
  const withdraw = vi.fn().mockResolvedValue(undefined)

  const shelf = {
    books: [book],
    loading: false,
    error: null,
    addBook: vi.fn(),
    updateBook: vi.fn(),
    removeBook: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
  }
  const feed = {
    mine,
    feed: null,
    loadingFeed: false,
    error: null,
    loadFeed: vi.fn(),
    recommend,
    withdraw,
  } as unknown as Recommended

  render(
    <MemoryRouter initialEntries={[`/buch/${book.id}`]}>
      <BooksContext.Provider value={shelf}>
        <RecommendationsContext.Provider value={feed}>
          <Routes>
            <Route path="/buch/:id" element={<BookDetail />} />
          </Routes>
        </RecommendationsContext.Provider>
      </BooksContext.Provider>
    </MemoryRouter>,
  )

  return { recommend, withdraw }
}

function theDialog() {
  const form = screen.getByLabelText('Ein Satz zur Empfehlung').closest('form')
  if (!form) throw new Error('Der Empfehlen-Dialog steht nicht offen')
  return within(form)
}

describe('BookDetail, recommending', () => {
  it('offers the stone on a book that is finished', () => {
    open(aBook({ status: BookStatus.Read }))

    expect(screen.getByRole('button', { name: 'Empfehlen' })).toBeInTheDocument()
  })

  it('offers it on a book somebody is in the middle of', () => {
    open(aBook({ status: BookStatus.Reading }))

    expect(screen.getByRole('button', { name: 'Empfehlen' })).toBeInTheDocument()
  })

  it('offers nothing on a book from the someday pile', () => {
    open(aBook({ status: BookStatus.WantToRead }))

    expect(screen.queryByRole('button', { name: 'Empfehlen' })).not.toBeInTheDocument()
  })

  it('offers nothing on an abandoned book', () => {
    open(aBook({ status: BookStatus.Abandoned }))

    expect(screen.queryByRole('button', { name: 'Empfehlen' })).not.toBeInTheDocument()
  })

  it('hands over the book and the sentence, trimmed', () => {
    const book = aBook({ status: BookStatus.Read })
    const { recommend } = open(book)

    fireEvent.click(screen.getByRole('button', { name: 'Empfehlen' }))
    fireEvent.change(screen.getByLabelText('Ein Satz zur Empfehlung'), {
      target: { value: '  Für alle, die Herrndorf mögen.  ' },
    })
    fireEvent.click(theDialog().getByRole('button', { name: 'Empfehlen' }))

    expect(recommend).toHaveBeenCalledWith(book, 'Für alle, die Herrndorf mögen.')
  })

  it('keeps the dialog shut until something is written', () => {
    const { recommend } = open(aBook({ status: BookStatus.Read }))

    fireEvent.click(screen.getByRole('button', { name: 'Empfehlen' }))
    const send = theDialog().getByRole('button', { name: 'Empfehlen' })

    expect(send).toBeDisabled()

    fireEvent.click(send)

    expect(recommend).not.toHaveBeenCalled()
  })

  it('does not take blanks for a sentence', () => {
    const { recommend } = open(aBook({ status: BookStatus.Read }))

    fireEvent.click(screen.getByRole('button', { name: 'Empfehlen' }))
    fireEvent.change(screen.getByLabelText('Ein Satz zur Empfehlung'), {
      target: { value: '   ' },
    })
    fireEvent.click(theDialog().getByRole('button', { name: 'Empfehlen' }))

    expect(recommend).not.toHaveBeenCalled()
    expect(theDialog().getByRole('button', { name: 'Empfehlen' })).toBeDisabled()
  })

  it('opens the way out again as soon as a sentence stands', () => {
    const { recommend } = open(aBook({ status: BookStatus.Read }))

    fireEvent.click(screen.getByRole('button', { name: 'Empfehlen' }))
    fireEvent.change(screen.getByLabelText('Ein Satz zur Empfehlung'), {
      target: { value: 'Kurz, aber wahr.' },
    })

    expect(theDialog().getByRole('button', { name: 'Empfehlen' })).toBeEnabled()

    fireEvent.click(theDialog().getByRole('button', { name: 'Empfehlen' }))

    expect(recommend).toHaveBeenCalledTimes(1)
  })

  it('lets somebody back out of the dialog without recommending', () => {
    const { recommend } = open(aBook({ status: BookStatus.Read }))

    fireEvent.click(screen.getByRole('button', { name: 'Empfehlen' }))
    fireEvent.click(theDialog().getByRole('button', { name: 'Abbrechen' }))

    expect(recommend).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Ein Satz zur Empfehlung')).not.toBeInTheDocument()
  })
})

describe('BookDetail, taking it back', () => {
  const book = aBook({ id: 'b42', status: BookStatus.Read })
  const already = () => [aRecommendation({ id: 'r42', book_id: 'b42' })]

  it('shows the recommended stone instead of the offer', () => {
    open(book, already())

    expect(screen.getByRole('button', { name: 'Empfohlen — zurücknehmen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Empfehlen' })).not.toBeInTheDocument()
  })

  it('asks before it takes anything back', () => {
    const { withdraw } = open(book, already())

    fireEvent.click(screen.getByRole('button', { name: 'Empfohlen — zurücknehmen' }))

    expect(screen.getByText('Empfehlung zurücknehmen?')).toBeInTheDocument()
    expect(withdraw).not.toHaveBeenCalled()
  })

  it('takes it back once, by its own id, after the question is answered', () => {
    const { withdraw } = open(book, already())

    fireEvent.click(screen.getByRole('button', { name: 'Empfohlen — zurücknehmen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zurücknehmen' }))

    expect(withdraw).toHaveBeenCalledTimes(1)
    expect(withdraw).toHaveBeenCalledWith('r42')
  })

  it('leaves the recommendation standing when the question is declined', () => {
    const { withdraw } = open(book, already())

    fireEvent.click(screen.getByRole('button', { name: 'Empfohlen — zurücknehmen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stehen lassen' }))

    expect(withdraw).not.toHaveBeenCalled()
  })

  it('does not mistake the recommendation of another book for this one', () => {
    open(book, [aRecommendation({ book_id: 'b7' })])

    expect(screen.getByRole('button', { name: 'Empfehlen' })).toBeInTheDocument()
  })
})
