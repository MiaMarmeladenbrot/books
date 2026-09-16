import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BookFormat } from '../types'
import type { Candidate, Lookup } from './lookup'
import DNB_NOVEL from './fixtures/dnb-isbn-9783499256356.xml?raw'
import DNB_EXACT from './fixtures/dnb-tschick-exact.xml?raw'
import DNB_BROAD from './fixtures/dnb-tschick-broad.xml?raw'
import DNB_EMPTY from './fixtures/dnb-empty.xml?raw'
import OPENLIBRARY_NOVEL from './fixtures/openlibrary-isbn-9783499256356.json?raw'
import OPENLIBRARY_SEARCH from './fixtures/openlibrary-tschick-search.json?raw'

const OPENLIBRARY_UNKNOWN = '{}'

const UNREACHABLE = Symbol('unreachable')

interface Route {
  when: string
  answer: string | typeof UNREACHABLE
}

let asked: string[] = []

function catalogues(...routes: Route[]) {
  asked = []
  vi.stubGlobal('fetch', async (target: string | URL) => {
    const url = String(target)
    asked.push(url)
    const route = routes.find((entry) => url.includes(entry.when))
    if (!route) throw new Error(`no catalogue stubbed for ${url}`)
    if (route.answer === UNREACHABLE) throw new TypeError('failed to fetch')
    return new Response(route.answer, { status: 200 })
  })
}

async function freshLookup() {
  vi.resetModules()
  return (await import('./lookup')).lookupBooks
}

function titled(lookup: Lookup, fragment: string) {
  return lookup.results.filter((candidate) => candidate.title.includes(fragment))
}

function withIsbn(results: Candidate[], isbn: string) {
  return results.filter((candidate) => candidate.isbn === isbn)
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('looking a scanned barcode up', () => {
  it('reads a whole book out of one DNB record', async () => {
    catalogues({ when: 'services.dnb.de', answer: DNB_NOVEL })
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('978-3-499-25635-6')

    expect(lookup.query).toBe('isbn')
    expect(lookup.asked).toBe(1)
    expect(lookup.silent).toBe(0)
    expect(lookup.results).toHaveLength(1)
    expect(lookup.results[0]).toMatchObject({
      title: 'Tschick',
      subtitle: 'Roman',
      authors: ['Wolfgang Herrndorf'],
      isbn: '9783499256356',
      published_year: 2012,
      page_count: 253,
      format: BookFormat.Paperback,
      language: 'de',
      publisher: 'Rowohlt-Taschenbuch-Verl.',
      source: 'DNB',
    })
  })

  it('does not mistake the imprint in the record for a series', async () => {
    catalogues({ when: 'services.dnb.de', answer: DNB_NOVEL })
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('9783499256356')

    expect(lookup.results[0].series).toBeNull()
    expect(lookup.results[0].series_volume).toBeNull()
  })

  it('leaves the second catalogue alone once the first has answered', async () => {
    catalogues({ when: 'services.dnb.de', answer: DNB_NOVEL })
    const lookupBooks = await freshLookup()

    await lookupBooks('9783499256356')

    expect(asked).toHaveLength(1)
    expect(asked[0]).toContain('query=num%3D9783499256356')
  })

  it('falls through to OpenLibrary when the DNB is unreachable', async () => {
    catalogues(
      { when: 'services.dnb.de', answer: UNREACHABLE },
      { when: 'openlibrary.org/api/books', answer: OPENLIBRARY_NOVEL }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('9783499256356')

    expect(lookup.asked).toBe(2)
    expect(lookup.silent).toBe(1)
    expect(lookup.results[0]).toMatchObject({
      title: 'Tschick',
      authors: ['Wolfgang Herrndorf'],
      isbn: '9783499256356',
      published_year: 2012,
      publisher: 'Rowohlt Verlag',
      source: 'OpenLibrary',
    })
  })

  it('comes back empty when no catalogue has the number, and asks again next time', async () => {
    catalogues(
      { when: 'services.dnb.de', answer: DNB_EMPTY },
      { when: 'openlibrary.org/api/books', answer: OPENLIBRARY_UNKNOWN }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('9783518000000')

    expect(lookup.results).toEqual([])
    expect(lookup.asked).toBe(2)
    expect(lookup.silent).toBe(0)

    await lookupBooks('9783518000000')
    expect(asked).toHaveLength(4)
  })
})

describe('looking a title up', () => {
  const textSearch = () =>
    catalogues(
      { when: 'query=tst', answer: DNB_EXACT },
      { when: 'query=tit', answer: DNB_BROAD },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_SEARCH }
    )

  it('asks both DNB queries and OpenLibrary, each with its own limit', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Tschick')

    expect(lookup.query).toBe('text')
    expect(lookup.asked).toBe(3)
    expect(lookup.silent).toBe(0)
    expect(asked.some((url) => url.includes('query=tst') && url.includes('maximumRecords=10'))).toBe(
      true
    )
    expect(asked.some((url) => url.includes('query=tit') && url.includes('maximumRecords=20'))).toBe(
      true
    )
    expect(asked.some((url) => url.includes('openlibrary.org/search.json'))).toBe(true)
  })

  it('keeps the edition that both DNB queries returned exactly once', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Tschick')

    expect(withIsbn(lookup.results, '9783733509200')).toHaveLength(1)
  })

  it('drops the classroom material the broad query drags in', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Tschick')

    expect(titled(lookup, 'Kopiervorlagen')).toEqual([])
  })

  it('recognises the spoken edition as an audiobook', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Tschick')

    expect(titled(lookup, 'Hörspiel')[0]).toMatchObject({ format: BookFormat.Audiobook })
  })

  it('takes the series from the record where the title has none', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Tschick')

    expect(withIsbn(lookup.results, '9783126741330')[0]).toMatchObject({
      series: 'Deutsch - leichter lesen',
    })
  })

  it('puts the plain title first and says there is more', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Tschick')

    expect(lookup.results[0].title).toBe('Tschick')
    expect(lookup.moreAvailable).toBe(true)
  })

  it('finds the decomposed umlaut the DNB sends with a composed one typed', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Hörspiel')
    const spoken = lookup.results[0]

    expect(spoken.title).toBe('Tschick - Hörspiel')
    expect(spoken.title.normalize('NFC')).toBe(spoken.title)
  })

  it('hands the DNB results over before OpenLibrary has answered', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    const early: Lookup[] = []
    const lookup = await lookupBooks('Tschick', (answer) => early.push(answer))

    expect(early).toHaveLength(1)
    expect(early[0].results.every((candidate) => candidate.source === 'DNB')).toBe(true)
    expect(lookup.results.some((candidate) => candidate.source === 'OpenLibrary')).toBe(true)
  })

  it('counts a silent catalogue and answers from the other one', async () => {
    catalogues(
      { when: 'query=tst', answer: UNREACHABLE },
      { when: 'query=tit', answer: DNB_BROAD },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_SEARCH }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Tschick')

    expect(lookup.asked).toBe(3)
    expect(lookup.silent).toBe(1)
    expect(lookup.results.length).toBeGreaterThan(0)
  })

  it('answers the same question from memory the second time', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    await lookupBooks('Tschick')
    const afterFirst = asked.length
    await lookupBooks('Tschick')

    expect(asked).toHaveLength(afterFirst)
  })
})
