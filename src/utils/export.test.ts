import { describe, expect, it } from 'vitest'
import { booksToCsv } from './export'
import { BookFormat, BookProvenance, BookStatus } from '../types'
import type { Book } from '../types'

const BOM = '﻿'

const HEADER =
  'Titel,Untertitel,Autor(en),Reihe,Band,ISBN,Erschienen,Seiten,Format,Sprache,Erhalten als,Status,Lesebeginn,Leseende,Erhalten am,Bewertung,Notiz'

function book(changes: Partial<Book> = {}): Book {
  return {
    id: 'b1',
    user_id: 'u1',
    title: 'Across the Universe',
    subtitle: null,
    authors: ['Beth Revis'],
    series: null,
    series_volume: null,
    isbn: '9783161484100',
    published_year: 2011,
    page_count: 398,
    format: BookFormat.Paperback,
    provenance: BookProvenance.Bought,
    language: 'de',
    status: BookStatus.Read,
    started_on: '2026-09-01',
    finished_on: '2026-09-13',
    acquired_on: '2026-08-20',
    rating: 4,
    notes: null,
    cover_path: null,
    source_meta: {},
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-09-13T20:00:00Z',
    ...changes,
  }
}

function rows(csv: string) {
  return csv.slice(BOM.length).split('\r\n')
}

describe('booksToCsv', () => {
  it('opens with the BOM and the header row', () => {
    const csv = booksToCsv([])

    expect(csv.startsWith(BOM)).toBe(true)
    expect(rows(csv)[0]).toBe(HEADER)
  })

  it('closes every row with CRLF, the last one included', () => {
    const csv = booksToCsv([book()])

    expect(csv.endsWith('\r\n')).toBe(true)
    expect(rows(csv)).toHaveLength(3)
    expect(rows(csv)[2]).toBe('')
  })

  it('writes the values in the order of the header', () => {
    const csv = booksToCsv([book()])

    expect(rows(csv)[1]).toBe(
      'Across the Universe,,Beth Revis,,,9783161484100,2011,398,Taschenbuch,Deutsch,Kauf,Fertig,2026-09-01,2026-09-13,2026-08-20,4,'
    )
  })

  it('strings several authors together with a semicolon', () => {
    const csv = booksToCsv([book({ authors: ['Ilse Aichinger', 'Günter Eich'] })])

    expect(rows(csv)[1]).toContain('Ilse Aichinger; Günter Eich')
  })

  it('quotes a title that carries a comma', () => {
    const csv = booksToCsv([book({ title: 'Krieg, und Frieden' })])

    expect(rows(csv)[1].startsWith('"Krieg, und Frieden",')).toBe(true)
  })

  it('doubles the quotes inside a note', () => {
    const csv = booksToCsv([book({ notes: 'sie sagt "nie wieder"' })])

    expect(rows(csv)[1].endsWith(',"sie sagt ""nie wieder"""')).toBe(true)
  })

  it('holds a line break in the note inside its field', () => {
    const csv = booksToCsv([book({ notes: 'erste Zeile\nzweite Zeile' })])

    expect(rows(csv)).toHaveLength(3)
    expect(rows(csv)[1]).toContain('"erste Zeile\nzweite Zeile"')
  })

  it('leaves empty fields empty rather than writing null', () => {
    const csv = booksToCsv([
      book({
        subtitle: null,
        series: null,
        series_volume: null,
        isbn: null,
        published_year: null,
        page_count: null,
        format: null,
        provenance: null,
        language: null,
        started_on: null,
        finished_on: null,
        acquired_on: null,
        rating: null,
        notes: null,
      }),
    ])

    expect(rows(csv)[1]).toBe('Across the Universe,,Beth Revis,,,,,,,,,Fertig,,,,,')
  })

  it('writes an unknown language as its code in capitals', () => {
    const csv = booksToCsv([book({ language: 'xx' })])

    expect(rows(csv)[1]).toContain(',XX,')
  })

  it('gives every book its own row', () => {
    const csv = booksToCsv([book({ id: 'b1' }), book({ id: 'b2', title: 'Slags' })])

    expect(rows(csv)).toHaveLength(4)
    expect(rows(csv)[2].startsWith('Slags,')).toBe(true)
  })
})
