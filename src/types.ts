export const BookStatus = {
  WantToRead: 'want_to_read',
  Reading: 'reading',
  Read: 'read',
  Abandoned: 'abandoned',
} as const

export const BookFormat = {
  Paperback: 'paperback',
  Hardcover: 'hardcover',
  Ebook: 'ebook',
  Audiobook: 'audiobook',
} as const

export const BookProvenance = {
  Bought: 'bought',
  Gift: 'gift',
  Download: 'download',
  Borrowed: 'borrowed',
} as const

export type BookStatus = (typeof BookStatus)[keyof typeof BookStatus]
export type BookFormat = (typeof BookFormat)[keyof typeof BookFormat]
export type BookProvenance = (typeof BookProvenance)[keyof typeof BookProvenance]

export const STATUS_ORDER = Object.values(BookStatus)
export const FORMAT_ORDER = Object.values(BookFormat)
export const PROVENANCE_ORDER = Object.values(BookProvenance)

export const STATUS_LABEL: Record<BookStatus, string> = {
  [BookStatus.WantToRead]: 'Will ich lesen',
  [BookStatus.Reading]: 'Am Lesen',
  [BookStatus.Read]: 'Gelesen',
  [BookStatus.Abandoned]: 'Abgebrochen',
}

export const FORMAT_LABEL: Record<BookFormat, string> = {
  [BookFormat.Paperback]: 'Taschenbuch',
  [BookFormat.Hardcover]: 'Hardcover',
  [BookFormat.Ebook]: 'E-Book',
  [BookFormat.Audiobook]: 'Hörbuch',
}

export const PROVENANCE_LABEL: Record<BookProvenance, string> = {
  [BookProvenance.Bought]: 'Kauf',
  [BookProvenance.Gift]: 'Geschenk',
  [BookProvenance.Download]: 'Download',
  [BookProvenance.Borrowed]: 'Leihe',
}

export const LANGUAGE_LABEL: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  es: 'Spanisch',
  it: 'Italienisch',
  nl: 'Niederländisch',
  sv: 'Schwedisch',
  da: 'Dänisch',
  no: 'Norwegisch',
  fi: 'Finnisch',
  pl: 'Polnisch',
  pt: 'Portugiesisch',
  ru: 'Russisch',
  tr: 'Türkisch',
  ja: 'Japanisch',
  la: 'Latein',
}

export const LANGUAGE_ORDER = Object.keys(LANGUAGE_LABEL)

export function languageLabel(code: string) {
  return LANGUAGE_LABEL[code] ?? code.toUpperCase()
}

export interface Book {
  id: string
  user_id: string
  title: string
  subtitle: string | null
  authors: string[]
  series: string | null
  series_volume: number | null
  isbn: string | null
  published_year: number | null
  page_count: number | null
  format: BookFormat | null
  provenance: BookProvenance | null
  language: string | null
  status: BookStatus
  started_on: string | null
  finished_on: string | null
  acquired_on: string | null
  rating: number | null
  notes: string | null
  cover_path: string | null
  source_meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type BookDraft = Omit<
  Book,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'cover_path'
> & { cover_path?: string | null }
