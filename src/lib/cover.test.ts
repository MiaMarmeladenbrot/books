import { describe, expect, it, vi } from 'vitest'
import { coverSources } from './cover'

vi.mock('./supabase', () => ({
  coverUrl: (path: string | null) => (path ? `https://bucket.test/${path}` : null),
  sharedCoverPath: (isbn: string) => `isbn/${isbn}.jpg`,
}))

describe('coverSources', () => {
  it('offers the stored file, then the edition, then the service', () => {
    expect(coverSources('9783161484100', 'isbn/9783161484100.jpg')).toEqual([
      'https://bucket.test/isbn/9783161484100.jpg',
      'https://bucket.test/isbn/9783161484100.jpg',
      '/api/cover?isbn=9783161484100',
    ])
  })

  it('never names a stored file the caller did not give it', () => {
    expect(coverSources('9783161484100')).toEqual([
      null,
      'https://bucket.test/isbn/9783161484100.jpg',
      '/api/cover?isbn=9783161484100',
    ])
  })

  it('asks the bucket and the service for the same edition', () => {
    const [, edition, service] = coverSources('3257070845')

    expect(edition).toBe('https://bucket.test/isbn/9783257070842.jpg')
    expect(service).toBe('/api/cover?isbn=9783257070842')
  })

  it('keeps the reader own file when the ISBN leads nowhere', () => {
    expect(coverSources('unbekannt', 'konto/foto-1.jpg')).toEqual([
      'https://bucket.test/konto/foto-1.jpg',
      null,
      null,
    ])
  })

  it('has nothing at all for a book with neither', () => {
    expect(coverSources(null)).toEqual([null, null, null])
  })
})
