import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Shelf } from './pages/Shelf'
import { BooksContext } from './store/booksContextValue'
import { aBook } from './test-books'
import { overwriteGetLocale, type Locale } from './paraglide/runtime.js'
import { formatDay, formatNumber, formatRange, monthLabel } from './utils/format'
import { STATUS_LABEL, languageLabel } from './types'
import { BookStatus } from './types'

vi.mock('./lib/supabase', () => ({
  coverUrl: (path: string | null) => (path ? `https://bucket.test/${path}` : null),
  sharedCoverPath: (isbn: string) => `isbn/${isbn}.jpg`,
}))

let locale: Locale = 'de'
overwriteGetLocale(() => locale)

function speaking<T>(spoken: Locale, read: () => T) {
  locale = spoken
  try {
    return read()
  } finally {
    locale = 'de'
  }
}

afterEach(() => {
  locale = 'de'
})

describe('an English reader', () => {
  it('gets the shelf in English', () => {
    speaking('en', () => {
      render(
        <MemoryRouter>
          <BooksContext.Provider
            value={{
              books: [aBook({ status: BookStatus.WantToRead })],
              loading: false,
              error: null,
              addBook: vi.fn(),
              updateBook: vi.fn(),
              removeBook: vi.fn(),
              reload: vi.fn(),
            }}
          >
            <Shelf />
          </BooksContext.Provider>
        </MemoryRouter>,
      )

      expect(screen.getByText('1 book')).toBeInTheDocument()
      expect(screen.getByLabelText('Search the shelf by title or author')).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Wishlist' })).toBeInTheDocument()
    })
  })
})

describe('the formatters, which cache one set per locale', () => {
  it('does not serve the locale that asked first to the one that asks second', () => {
    expect(formatNumber(1234)).toBe('1.234')
    expect(speaking('en', () => formatNumber(1234))).toBe('1,234')
    expect(formatNumber(1234)).toBe('1.234')
  })

  it('names the months and the days in the language that is reading', () => {
    expect(monthLabel('2026-09')).toBe('September 2026')
    expect(speaking('en', () => monthLabel('2026-03'))).toBe('March 2026')
    expect(formatDay('2026-03-14')).toBe('14. März 2026')
    expect(speaking('en', () => formatDay('2026-03-14'))).toBe('Mar 14, 2026')
  })

  it('says since in the language that is reading', () => {
    expect(formatRange('2026-03-14', null)).toBe('seit 14. März 2026')
    expect(speaking('en', () => formatRange('2026-03-14', null))).toBe('since March 14, 2026')
  })
})

describe('the labels, which cache language names per locale', () => {
  it('turns a code into a name the reader knows', () => {
    expect(languageLabel('sv')).toBe('Schwedisch')
    expect(speaking('en', () => languageLabel('sv'))).toBe('Swedish')
    expect(languageLabel('sv')).toBe('Schwedisch')
  })

  it('still falls back to capitals in either language', () => {
    expect(languageLabel('xx')).toBe('XX')
    expect(speaking('en', () => languageLabel('xx'))).toBe('XX')
  })

  it('reads a status out of the catalogue, not out of a frozen map', () => {
    expect(STATUS_LABEL[BookStatus.Abandoned]()).toBe('Abgebrochen')
    expect(speaking('en', () => STATUS_LABEL[BookStatus.Abandoned]())).toBe('Gave up')
  })
})
