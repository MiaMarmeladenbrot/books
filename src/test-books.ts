import { AvatarName, BookFormat, BookProvenance, BookStatus } from './types'
import type { Book, FeedEntry, Recommendation } from './types'

let made = 0

export function aBook(changes: Partial<Book> = {}): Book {
  made += 1
  return {
    id: `b${made}`,
    user_id: 'u1',
    title: `Buch ${made}`,
    subtitle: null,
    authors: ['Beth Revis'],
    series: null,
    series_volume: null,
    isbn: null,
    published_year: 2011,
    page_count: 300,
    format: BookFormat.Paperback,
    provenance: BookProvenance.Bought,
    language: 'de',
    status: BookStatus.Read,
    started_on: '2026-09-01',
    finished_on: '2026-09-13',
    acquired_on: null,
    rating: null,
    notes: null,
    cover_path: null,
    source_meta: {},
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-09-13T20:00:00Z',
    ...changes,
  }
}

export function aRecommendation(changes: Partial<Recommendation> = {}): Recommendation {
  made += 1
  return {
    id: `r${made}`,
    user_id: 'u1',
    book_id: `b${made}`,
    title: `Buch ${made}`,
    authors: ['Beth Revis'],
    isbn: null,
    note: null,
    created_at: '2026-09-17T09:00:00Z',
    ...changes,
  }
}

export function aFeedEntry(changes: Partial<FeedEntry> = {}): FeedEntry {
  const { profiles, ...rest } = changes
  return {
    ...aRecommendation(rest),
    profiles:
      'profiles' in changes
        ? (profiles ?? null)
        : { display_name: 'Sinja', avatar: AvatarName.Owl },
  }
}
