import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Stats } from './Stats'
import { BooksContext } from '../store/booksContextValue'
import { aBook } from '../test-books'
import { BookFormat, BookProvenance, BookStatus } from '../types'
import type { Book } from '../types'

function statistics(books: Book[], { loading = false } = {}) {
  const value = {
    books,
    loading,
    error: null,
    addBook: vi.fn(),
    updateBook: vi.fn(),
    removeBook: vi.fn(),
    reload: vi.fn().mockResolvedValue(undefined),
  }

  render(
    <MemoryRouter>
      <BooksContext.Provider value={value}>
        <Stats />
      </BooksContext.Provider>
    </MemoryRouter>,
  )
}

function bigNumberFor(label: string) {
  return screen.getByText(label, { selector: 'div' }).previousElementSibling?.textContent
}

function colorOf(language: string) {
  const dot = screen.getByText(language).previousElementSibling as HTMLElement
  return dot.style.backgroundColor
}

function chip(label: string) {
  return screen.getByRole('button', { name: label })
}

function panel(title: string) {
  return screen.getByText(title).closest('section') as HTMLElement
}

function legendOf(title: string) {
  return within(panel(title))
    .getAllByRole('listitem')
    .map((entry) => ({
      label: entry.children[1].textContent,
      color: (entry.children[0] as HTMLElement).style.backgroundColor,
    }))
}

const GREY = 'rgb(160, 149, 133)'

const TSCHICK = aBook({
  title: 'Tschick',
  authors: ['Wolfgang Herrndorf'],
  language: 'de',
  page_count: 253,
  started_on: '2026-09-01',
  finished_on: '2026-09-13',
  format: BookFormat.Paperback,
  provenance: BookProvenance.Bought,
})

const SLAGS = aBook({
  title: 'Slags',
  authors: ['Emma Jane Unsworth'],
  language: 'en',
  page_count: null,
  started_on: '2026-09-18',
  finished_on: '2026-09-20',
  format: BookFormat.Hardcover,
  provenance: BookProvenance.Gift,
})

const WISENT = aBook({
  title: 'Der Wisent',
  authors: ['Wolfgang Herrndorf'],
  language: 'de',
  page_count: 432,
  started_on: '2025-03-01',
  finished_on: '2025-03-05',
})

const UNIVERSE = aBook({
  title: 'Across the Universe',
  authors: ['Beth Revis'],
  language: 'en',
  page_count: 398,
  started_on: '2025-05-01',
  finished_on: '2025-05-10',
})

const MILLION = aBook({
  title: 'A Million Suns',
  authors: ['Beth Revis'],
  language: 'en',
  page_count: 380,
  started_on: '2025-06-01',
  finished_on: '2025-06-10',
})

const READING = aBook({
  title: 'Mittendrin',
  status: BookStatus.Reading,
  started_on: '2026-09-25',
  finished_on: null,
})

const SHELF = [TSCHICK, SLAGS, WISENT, UNIVERSE, MILLION, READING]

describe('the statistics page', () => {
  it('opens on the most recent year that has finished books', () => {
    statistics(SHELF)

    expect(bigNumberFor('Bücher')).toBe('2')
    expect(bigNumberFor('Seiten')).toBe('253')
  })

  it('counts only what was finished', () => {
    statistics(SHELF)

    fireEvent.click(chip('Alle'))

    expect(bigNumberFor('Bücher insgesamt')).toBe('5')
    expect(bigNumberFor('Seiten insgesamt')).toBe('1.463')
  })

  it('moves to another year when its chip is pressed', () => {
    statistics(SHELF)

    fireEvent.click(chip('2025'))

    expect(bigNumberFor('Bücher')).toBe('3')
    expect(bigNumberFor('Seiten')).toBe('1.210')
  })

  it('averages the pages over the books that have a page count', () => {
    statistics(SHELF)

    expect(within(panel('Auf einen Blick')).getByText('253')).toBeInTheDocument()

    fireEvent.click(chip('Alle'))
    expect(within(panel('Auf einen Blick')).getByText('366')).toBeInTheDocument()
  })

  it('averages the reading days with a comma', () => {
    statistics(SHELF)

    expect(within(panel('Auf einen Blick')).getByText('7,0')).toBeInTheDocument()

    fireEvent.click(chip('2025'))
    expect(within(panel('Auf einen Blick')).getByText('7,3')).toBeInTheDocument()
  })

  it('has a dash where no book has both dates', () => {
    statistics([aBook({ title: 'Ohne Anfang', started_on: null, finished_on: '2026-09-13' })])

    expect(within(panel('Auf einen Blick')).getByText('—')).toBeInTheDocument()
  })

  it('names the thickest book of the year', () => {
    statistics(SHELF)

    const glance = within(panel('Auf einen Blick'))
    expect(glance.getByText('Dickstes Buch mit 253 Seiten')).toBeInTheDocument()
    expect(glance.getByText('Tschick')).toBeInTheDocument()

    fireEvent.click(chip('2025'))
    expect(within(panel('Auf einen Blick')).getByText('Der Wisent')).toBeInTheDocument()
  })

  it('ranks the authors by books, then by name', () => {
    statistics(SHELF)
    fireEvent.click(chip('Alle'))

    const names = within(panel('Meistgelesene Autor:innen'))
      .getAllByRole('listitem')
      .map((entry) => entry.children[1].textContent)

    expect(names).toEqual(['Beth Revis', 'Wolfgang Herrndorf', 'Emma Jane Unsworth'])
  })

  it('keeps a language its colour when the year changes', () => {
    statistics(SHELF)
    fireEvent.click(chip('Alle'))
    const overall = colorOf('Deutsch')

    fireEvent.click(chip('2026'))

    expect(colorOf('Deutsch')).toBe(overall)
    expect(colorOf('Englisch')).not.toBe(overall)
  })

  it('gathers the languages it has no colour left for under Andere', () => {
    statistics([
      aBook({ language: 'de', finished_on: '2026-01-02' }),
      aBook({ language: 'en', finished_on: '2026-01-03' }),
      aBook({ language: 'fr', finished_on: '2026-01-04' }),
      aBook({ language: 'sv', finished_on: '2026-01-05' }),
      aBook({ language: 'pl', finished_on: '2026-01-06' }),
    ])

    expect(within(panel('Sprache')).getByText('Andere')).toBeInTheDocument()
  })

  it('counts the books without a value as Unbekannt, grey and at the end', () => {
    statistics([
      aBook({ format: BookFormat.Hardcover }),
      aBook({ format: null }),
      aBook({ format: null }),
      aBook({ format: null }),
    ])

    const legend = legendOf('Format')
    expect(legend.map((entry) => entry.label)).toEqual(['Hardcover', 'Unbekannt'])
    expect(legend[1].color).toBe(GREY)
  })

  it('shows an unknown provenance as Unbekannt', () => {
    statistics([aBook({ provenance: BookProvenance.Gift }), aBook({ provenance: null })])

    expect(legendOf('Herkunft').map((entry) => entry.label)).toEqual(['Geschenk', 'Unbekannt'])
  })

  it('keeps an unknown language apart from the ones under Andere', () => {
    statistics([
      aBook({ language: 'de' }),
      aBook({ language: 'en' }),
      aBook({ language: 'fr' }),
      aBook({ language: 'sv' }),
      aBook({ language: 'pl' }),
      aBook({ language: null }),
    ])

    const legend = legendOf('Sprache')
    expect(legend.map((entry) => entry.label)).toContain('Andere')
    expect(legend.at(-1)).toEqual({ label: 'Unbekannt', color: GREY })
  })

  it('leaves Unbekannt out while every book has a value', () => {
    statistics(SHELF)

    expect(screen.queryByText('Unbekannt')).not.toBeInTheDocument()
  })

  describe('with nothing finished yet', () => {
    it('invites to add the first book when the shelf is empty', () => {
      statistics([])

      expect(screen.getByText('Noch nichts fertig gelesen')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Erstes Buch erfassen' })).toHaveAttribute(
        'href',
        '/buch/suchen',
      )
      expect(screen.queryByRole('button', { name: 'Alle' })).not.toBeInTheDocument()
    })

    it('offers no new book while some are still being read', () => {
      statistics([READING])

      expect(screen.getByText('Noch nichts fertig gelesen')).toBeInTheDocument()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('waits for the books before it calls the shelf empty', () => {
      statistics([], { loading: true })

      expect(screen.queryByText('Noch nichts fertig gelesen')).not.toBeInTheDocument()
    })
  })

  it('shows the months of a year, and not of all years at once', () => {
    statistics(SHELF)

    const months = within(panel('Pro Monat'))
    expect(months.getByText('2')).toBeInTheDocument()

    fireEvent.click(chip('Alle'))
    expect(screen.queryByText('Pro Monat')).not.toBeInTheDocument()
  })

  it('switches the monthly bars from books to pages', () => {
    statistics(SHELF)

    const months = within(panel('Pro Monat'))
    fireEvent.click(months.getByRole('button', { name: 'Seiten' }))

    expect(months.getByText('253')).toBeInTheDocument()
    expect(months.getByRole('button', { name: 'Seiten' })).toHaveAttribute('aria-pressed', 'true')
  })

  describe('the price tile', () => {
    const PRICED = [
      aBook({ title: 'Kairos', price: 24.5, finished_on: '2026-07-30' }),
      aBook({ title: 'Tschick', price: 12, finished_on: '2026-05-14' }),
      aBook({ title: 'Geschenkt', price: 0, finished_on: '2026-03-02' }),
      aBook({ title: 'Ohne Preis', price: null, finished_on: '2026-02-01' }),
      aBook({ title: 'Letztes Jahr', price: 30, finished_on: '2025-11-11' }),
    ]

    it('adds up the prices and averages them over the priced books', () => {
      statistics(PRICED)

      expect(bigNumberFor('ausgegeben')).toBe('36,50 €')
      expect(bigNumberFor('⌀ pro Buch')).toBe('12,17 €')
    })

    it('names the priciest book of the year', () => {
      statistics(PRICED)

      const prices = within(panel('Preis'))
      expect(prices.getByText('Teuerstes Buch für 24,50 €')).toBeInTheDocument()
      expect(prices.getByText('Kairos')).toBeInTheDocument()
    })

    it('says how many books the numbers rest on', () => {
      statistics(PRICED)

      expect(within(panel('Preis')).getByText('für 3 von 4 Büchern')).toBeInTheDocument()

      fireEvent.click(chip('2025'))
      expect(within(panel('Preis')).getByText('für 1 von 1 Buch')).toBeInTheDocument()
    })

    it('follows the chosen year', () => {
      statistics(PRICED)

      fireEvent.click(chip('Alle'))

      expect(bigNumberFor('ausgegeben')).toBe('66,50 €')
      expect(within(panel('Preis')).getByText('Letztes Jahr')).toBeInTheDocument()
    })

    it('asks for prices while no book of the year has one', () => {
      statistics(SHELF)

      const prices = within(panel('Preis'))
      expect(prices.getByText(/^Trag beim Buch ein, was es gekostet hat/)).toBeInTheDocument()
      expect(prices.queryByText('ausgegeben')).not.toBeInTheDocument()
      expect(prices.queryByText(/^für \d+ von/)).not.toBeInTheDocument()
    })
  })

  it('leaves the download to the profile', () => {
    statistics(SHELF)

    fireEvent.click(chip('Alle'))
    expect(screen.queryByText('Sicherung')).not.toBeInTheDocument()
  })
})
