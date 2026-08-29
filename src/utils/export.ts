import { FORMAT_LABEL, PROVENANCE_LABEL, STATUS_LABEL, languageLabel } from '../types'
import type { Book } from '../types'

const UTF8_BOM = String.fromCharCode(0xfeff)

const CSV_COLUMNS: { header: string; value: (book: Book) => string }[] = [
  { header: 'Titel', value: (book) => book.title },
  { header: 'Untertitel', value: (book) => book.subtitle ?? '' },
  { header: 'Autor(en)', value: (book) => book.authors.join('; ') },
  { header: 'Reihe', value: (book) => book.series ?? '' },
  { header: 'Band', value: (book) => book.series_volume?.toString() ?? '' },
  { header: 'ISBN', value: (book) => book.isbn ?? '' },
  { header: 'Erschienen', value: (book) => book.published_year?.toString() ?? '' },
  { header: 'Seiten', value: (book) => book.page_count?.toString() ?? '' },
  { header: 'Format', value: (book) => (book.format ? FORMAT_LABEL[book.format] : '') },
  { header: 'Sprache', value: (book) => (book.language ? languageLabel(book.language) : '') },
  {
    header: 'Erhalten als',
    value: (book) => (book.provenance ? PROVENANCE_LABEL[book.provenance] : ''),
  },
  { header: 'Status', value: (book) => STATUS_LABEL[book.status] },
  { header: 'Lesebeginn', value: (book) => book.started_on ?? '' },
  { header: 'Leseende', value: (book) => book.finished_on ?? '' },
  { header: 'Erhalten am', value: (book) => book.acquired_on ?? '' },
  { header: 'Bewertung', value: (book) => book.rating?.toString() ?? '' },
  { header: 'Notiz', value: (book) => book.notes ?? '' },
]

function escapeCsv(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function booksToCsv(books: Book[]) {
  const header = CSV_COLUMNS.map((column) => column.header).join(',')
  const rows = books.map((book) =>
    CSV_COLUMNS.map((column) => escapeCsv(column.value(book))).join(',')
  )
  return UTF8_BOM + [header, ...rows].join('\r\n') + '\r\n'
}

export function booksToJson(books: Book[]) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), books }, null, 2)
}

export function download(filename: string, mimeType: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
