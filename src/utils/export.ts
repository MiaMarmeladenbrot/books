import { m } from '../paraglide/messages.js'
import { FORMAT_LABEL, PROVENANCE_LABEL, STATUS_LABEL, languageLabel } from '../types'
import type { Book } from '../types'

const UTF8_BOM = String.fromCharCode(0xfeff)

const CSV_COLUMNS: { header: () => string; value: (book: Book) => string }[] = [
  { header: m.csv_title, value: (book) => book.title },
  { header: m.csv_subtitle, value: (book) => book.subtitle ?? '' },
  { header: m.csv_authors, value: (book) => book.authors.join('; ') },
  { header: m.csv_series, value: (book) => book.series ?? '' },
  { header: m.csv_volume, value: (book) => book.series_volume?.toString() ?? '' },
  { header: m.csv_isbn, value: (book) => book.isbn ?? '' },
  { header: m.csv_published, value: (book) => book.published_year?.toString() ?? '' },
  { header: m.csv_pages, value: (book) => book.page_count?.toString() ?? '' },
  { header: m.csv_format, value: (book) => (book.format ? FORMAT_LABEL[book.format]() : '') },
  { header: m.csv_language, value: (book) => (book.language ? languageLabel(book.language) : '') },
  {
    header: m.csv_provenance,
    value: (book) => (book.provenance ? PROVENANCE_LABEL[book.provenance]() : ''),
  },
  { header: m.csv_price, value: (book) => book.price?.toFixed(2) ?? '' },
  { header: m.csv_status, value: (book) => STATUS_LABEL[book.status]() },
  { header: m.csv_started, value: (book) => book.started_on ?? '' },
  { header: m.csv_finished, value: (book) => book.finished_on ?? '' },
  { header: m.csv_acquired, value: (book) => book.acquired_on ?? '' },
  { header: m.csv_rating, value: (book) => book.rating?.toString() ?? '' },
  { header: m.csv_note, value: (book) => book.notes ?? '' },
]

function escapeCsv(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function booksToCsv(books: Book[]) {
  const header = CSV_COLUMNS.map((column) => escapeCsv(column.header())).join(',')
  const rows = books.map((book) =>
    CSV_COLUMNS.map((column) => escapeCsv(column.value(book))).join(',')
  )
  return UTF8_BOM + [header, ...rows].join('\r\n') + '\r\n'
}

export function booksToJson(books: Book[]) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), books }, null, 2)
}

const KEEP_BLOB_ALIVE = 10_000

export function download(filename: string, mimeType: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), KEEP_BLOB_ALIVE)
}
