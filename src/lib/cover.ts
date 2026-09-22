import { coverForIsbn } from './coverEndpoint'
import { isbnThirteen } from './isbn'
import { coverUrl, sharedCoverPath } from './supabase'

export function coverSources(isbn: string | null, path: string | null = null) {
  const edition = isbn ? isbnThirteen(isbn) : null
  return [
    path ? coverUrl(path) : null,
    edition ? coverUrl(sharedCoverPath(edition)) : null,
    coverForIsbn(edition),
  ]
}
