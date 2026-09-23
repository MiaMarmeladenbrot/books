import { m } from './paraglide/messages.js'
import { getLocale } from './paraglide/runtime.js'

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

export const AvatarName = {
  Cat: 'cat',
  Mug: 'mug',
  Owl: 'owl',
  Glasses: 'glasses',
  Hedgehog: 'hedgehog',
  Moon: 'moon',
} as const

export type BookStatus = (typeof BookStatus)[keyof typeof BookStatus]
export type BookFormat = (typeof BookFormat)[keyof typeof BookFormat]
export type BookProvenance = (typeof BookProvenance)[keyof typeof BookProvenance]
export type AvatarName = (typeof AvatarName)[keyof typeof AvatarName]

export const STATUS_ORDER = Object.values(BookStatus)
export const FORMAT_ORDER = Object.values(BookFormat)
export const PROVENANCE_ORDER = Object.values(BookProvenance)
export const AVATAR_ORDER = Object.values(AvatarName)

export const AVATAR_LABEL: Record<AvatarName, () => string> = {
  [AvatarName.Cat]: m.avatar_cat,
  [AvatarName.Mug]: m.avatar_mug,
  [AvatarName.Owl]: m.avatar_owl,
  [AvatarName.Glasses]: m.avatar_glasses,
  [AvatarName.Hedgehog]: m.avatar_hedgehog,
  [AvatarName.Moon]: m.avatar_moon,
}

export const STATUS_LABEL: Record<BookStatus, () => string> = {
  [BookStatus.WantToRead]: m.status_want_to_read,
  [BookStatus.Reading]: m.status_reading,
  [BookStatus.Read]: m.status_read,
  [BookStatus.Abandoned]: m.status_abandoned,
}

export const FORMAT_LABEL: Record<BookFormat, () => string> = {
  [BookFormat.Paperback]: m.format_paperback,
  [BookFormat.Hardcover]: m.format_hardcover,
  [BookFormat.Ebook]: m.format_ebook,
  [BookFormat.Audiobook]: m.format_audiobook,
}

export const PROVENANCE_LABEL: Record<BookProvenance, () => string> = {
  [BookProvenance.Bought]: m.provenance_bought,
  [BookProvenance.Gift]: m.provenance_gift,
  [BookProvenance.Download]: m.provenance_download,
  [BookProvenance.Borrowed]: m.provenance_borrowed,
}

export const LANGUAGE_ORDER = [
  'de',
  'en',
  'fr',
  'es',
  'it',
  'nl',
  'sv',
  'da',
  'no',
  'fi',
  'pl',
  'pt',
  'ru',
  'tr',
  'ja',
  'la',
]

const languageNames = new Map<string, Intl.DisplayNames>()

export function languageLabel(code: string) {
  const locale = getLocale()
  let names = languageNames.get(locale)
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: 'language', fallback: 'none' })
    languageNames.set(locale, names)
  }
  try {
    return names.of(code) ?? code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
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

export interface Profile {
  user_id: string
  display_name: string | null
  avatar: AvatarName | null
  created_at: string
  updated_at: string
}

export type ProfileDraft = Pick<Profile, 'display_name' | 'avatar'>
