import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BookFormat } from '../types'
import type { Candidate, Lookup } from './lookup'
import DNB_NOVEL from './fixtures/dnb-isbn-9783499256356.xml?raw'
import DNB_EXACT from './fixtures/dnb-tschick-exact.xml?raw'
import DNB_BROAD from './fixtures/dnb-tschick-broad.xml?raw'
import DNB_EMPTY from './fixtures/dnb-empty.xml?raw'
import OPENLIBRARY_NOVEL from './fixtures/openlibrary-isbn-9783499256356.json?raw'
import OPENLIBRARY_SEARCH from './fixtures/openlibrary-tschick-search.json?raw'
import OPENLIBRARY_EDITION from './fixtures/openlibrary-edition-9783499256356.json?raw'
import GOOGLE_NOVEL from './fixtures/google-isbn-9783499256356.json?raw'
import GOOGLE_SEARCH from './fixtures/google-tschick-search.json?raw'

const OPENLIBRARY_UNKNOWN = '{"numFound":0,"docs":[]}'
const GOOGLE_UNKNOWN = '{}'

const UNREACHABLE = Symbol('unreachable')

interface Route {
  when: string
  answer: string | typeof UNREACHABLE
  after?: number
}

let asked: string[] = []

function catalogues(...routes: Route[]) {
  asked = []
  vi.stubGlobal('fetch', async (target: string | URL, init?: RequestInit) => {
    const url = String(target)
    asked.push(url)
    const route = routes.find((entry) => url.includes(entry.when))
    if (!route) throw new Error(`no catalogue stubbed for ${url}`)
    if (route.after) {
      await new Promise((resolve, reject) => {
        setTimeout(resolve, route.after)
        init?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')))
      })
    }
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
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_NOVEL }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('9783499256356')

    expect(lookup.asked).toBe(2)
    expect(lookup.silent).toBe(1)
    expect(lookup.results[0]).toMatchObject({
      title: 'Tschick',
      authors: ['Wolfgang Herrndorf'],
      isbn: '9783499256356',
      published_year: 2010,
      source: 'OpenLibrary',
    })
  })

  it('leaves the fields the index only averages empty', async () => {
    catalogues(
      { when: 'services.dnb.de', answer: UNREACHABLE },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_NOVEL }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('9783499256356')

    expect(lookup.results[0]).toMatchObject({
      page_count: null,
      publisher: null,
      language: null,
    })
  })

  it('fills those fields from the edition the ISBN names', async () => {
    catalogues(
      { when: 'services.dnb.de', answer: UNREACHABLE },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_NOVEL },
      { when: 'openlibrary.org/isbn/', answer: OPENLIBRARY_EDITION }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('9783499256356')

    expect(lookup.results[0]).toMatchObject({
      publisher: 'Rowohlt Verlag',
      cover_url: '/api/cover?isbn=9783499256356&cover=10838632',
    })
    expect(asked.some((url) => url.includes('openlibrary.org/isbn/9783499256356.json'))).toBe(true)
  })

  it('dates the edition that was scanned, not the work it belongs to', async () => {
    catalogues(
      { when: 'services.dnb.de', answer: UNREACHABLE },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_NOVEL },
      { when: 'openlibrary.org/isbn/', answer: OPENLIBRARY_EDITION }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('9783499256356')

    expect(lookup.results[0].published_year).toBe(2012)
  })

  it('takes the third catalogue when neither of the first two knows the number', async () => {
    catalogues(
      { when: 'services.dnb.de', answer: DNB_EMPTY },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_UNKNOWN },
      { when: 'api/books', answer: GOOGLE_NOVEL }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('9783499256356')

    expect(lookup.asked).toBe(3)
    expect(lookup.silent).toBe(0)
    expect(lookup.results[0]).toMatchObject({
      title: 'Tschick',
      subtitle: 'Roman',
      authors: ['Wolfgang Herrndorf'],
      isbn: '9783499256356',
      published_year: 2012,
      page_count: 253,
      language: 'de',
      source: 'Google',
    })
  })

  it('comes back empty when no catalogue has the number, and asks again next time', async () => {
    catalogues(
      { when: 'services.dnb.de', answer: DNB_EMPTY },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_UNKNOWN },
      { when: 'api/books', answer: GOOGLE_UNKNOWN }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('9783518000000')

    expect(lookup.results).toEqual([])
    expect(lookup.asked).toBe(3)
    expect(lookup.silent).toBe(0)

    await lookupBooks('9783518000000')
    expect(asked).toHaveLength(6)
  })
})

describe('looking a title up', () => {
  const textSearch = () =>
    catalogues(
      { when: 'query=tst', answer: DNB_EXACT },
      { when: 'query=tit', answer: DNB_BROAD },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_SEARCH },
      { when: '/api/books', answer: GOOGLE_SEARCH }
    )

  it('asks both DNB queries, OpenLibrary and Google, each with its own limit', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Tschick')

    expect(lookup.query).toBe('text')
    expect(lookup.asked).toBe(4)
    expect(lookup.silent).toBe(0)
    expect(asked.some((url) => url.includes('/api/books') && url.includes('limit=10'))).toBe(true)
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

  it('keeps the Google hits that name what was asked', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Tschick')

    expect(titled(lookup, 'Adjø')).toHaveLength(1)
    expect(titled(lookup, 'Adjø')[0]).toMatchObject({ source: 'Google', isbn: '9788290583830' })
  })

  it('drops the Google hits that only came along for the ride', async () => {
    textSearch()
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Tschick')

    expect(titled(lookup, 'Skeleton Man')).toEqual([])
    expect(titled(lookup, 'Pilsener Zeitung')).toEqual([])
    expect(titled(lookup, 'Thierleben')).toEqual([])
  })

  it('keeps a Google hit even when Google left its ISBN out', async () => {
    const withoutNumbers = {
      items: [{ volumeInfo: { title: 'Mandorla amara', authors: ['Maria Grazia Calandrone'] } }],
    }
    catalogues(
      { when: 'query=tst', answer: DNB_EMPTY },
      { when: 'query=tit', answer: DNB_EMPTY },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_UNKNOWN },
      { when: '/api/books', answer: JSON.stringify(withoutNumbers) }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Mandorla amara')

    expect(lookup.results).toHaveLength(1)
    expect(lookup.results[0]).toMatchObject({
      title: 'Mandorla amara',
      isbn: null,
      cover_url: null,
      source: 'Google',
    })
  })

  it('keeps the Google hits for a query made of short words only', async () => {
    const shortTitle = { items: [{ volumeInfo: { title: 'Ob es', authors: ['Anna Beispiel'] } }] }
    catalogues(
      { when: 'query=tst', answer: DNB_EMPTY },
      { when: 'query=tit', answer: DNB_EMPTY },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_UNKNOWN },
      { when: '/api/books', answer: JSON.stringify(shortTitle) }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Ob es')

    expect(lookup.results.map((candidate) => candidate.title)).toEqual(['Ob es'])
  })

  it('counts a silent catalogue and answers from the others', async () => {
    catalogues(
      { when: 'query=tst', answer: UNREACHABLE },
      { when: 'query=tit', answer: DNB_BROAD },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_SEARCH },
      { when: '/api/books', answer: GOOGLE_SEARCH }
    )
    const lookupBooks = await freshLookup()

    const lookup = await lookupBooks('Tschick')

    expect(lookup.asked).toBe(4)
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

describe('waiting for the catalogues', () => {
  const slowly = (openLibrary: number, google: number, broad = 0) =>
    catalogues(
      { when: 'query=tst', answer: DNB_EXACT },
      { when: 'query=tit', answer: DNB_BROAD, after: broad },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_SEARCH, after: openLibrary },
      { when: '/api/books', answer: GOOGLE_SEARCH, after: google }
    )

  async function watch(input: string, lookupBooks: Awaited<ReturnType<typeof freshLookup>>) {
    const updates: { at: number; lookup: Lookup }[] = []
    const started = Date.now()
    const pending = lookupBooks(input, (lookup) =>
      updates.push({ at: Date.now() - started, lookup })
    )
    await vi.advanceTimersByTimeAsync(10000)
    return { updates, lookup: await pending }
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows nothing before every catalogue that answers in time has answered', async () => {
    slowly(900, 1200)
    const lookupBooks = await freshLookup()
    vi.useFakeTimers()

    const { updates, lookup } = await watch('Tschick', lookupBooks)

    expect(updates).toEqual([])
    expect(lookup.later).toEqual([])
    const sources = new Set(lookup.results.map((candidate) => candidate.source))
    expect(sources).toEqual(new Set(['DNB', 'OpenLibrary', 'Google']))
  })

  it('shows what has come after a second and a half, and never reorders it', async () => {
    slowly(4000, 1000)
    const lookupBooks = await freshLookup()
    vi.useFakeTimers()

    const { updates, lookup } = await watch('Tschick', lookupBooks)

    expect(updates[0].at).toBe(1500)
    const first = updates[0].lookup.results
    expect(first.some((candidate) => candidate.source === 'Google')).toBe(true)
    expect(first.some((candidate) => candidate.source === 'OpenLibrary')).toBe(false)
    for (const { lookup: update } of updates) expect(update.results).toEqual(first)
    expect(lookup.results).toEqual(first)
  })

  it('puts the late catalogue underneath, without repeating what is already shown', async () => {
    slowly(4000, 1000, 3000)
    const lookupBooks = await freshLookup()
    vi.useFakeTimers()

    const { updates, lookup } = await watch('Tschick', lookupBooks)

    expect(updates.map((update) => update.at)).toEqual([1500, 3000, 4000])
    expect(lookup.later.some((candidate) => candidate.source === 'OpenLibrary')).toBe(true)
    expect(withIsbn([...lookup.results, ...lookup.later], '9783733509200')).toHaveLength(1)
    const everyShown = updates.map(({ lookup: update }) => [...update.results, ...update.later])
    everyShown.slice(1).forEach((shown, index) => {
      expect(shown.slice(0, everyShown[index].length)).toEqual(everyShown[index])
    })
  })

  it('shows the first answer at once when nothing came within the window', async () => {
    catalogues(
      { when: 'query=tst', answer: DNB_EMPTY },
      { when: 'query=tit', answer: DNB_EMPTY },
      { when: 'openlibrary.org/search.json', answer: OPENLIBRARY_SEARCH, after: 3500 },
      { when: '/api/books', answer: GOOGLE_SEARCH, after: 2500 }
    )
    const lookupBooks = await freshLookup()
    vi.useFakeTimers()

    const { updates, lookup } = await watch('Tschick', lookupBooks)

    expect(updates[0].at).toBe(2500)
    expect(updates[0].lookup.results.every((candidate) => candidate.source === 'Google')).toBe(
      true
    )
    expect(updates[0].lookup.later).toEqual([])
    expect(lookup.later.every((candidate) => candidate.source === 'OpenLibrary')).toBe(true)
  })

  it('gives up on a catalogue after five seconds', async () => {
    slowly(6000, 1000)
    const lookupBooks = await freshLookup()
    vi.useFakeTimers()

    const { lookup } = await watch('Tschick', lookupBooks)

    expect(lookup.silent).toBe(1)
    expect(lookup.later).toEqual([])
  })
})
