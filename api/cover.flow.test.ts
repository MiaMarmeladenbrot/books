import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from './cover.ts'

function jpeg(width: number, height: number, bytes = 8000) {
  const head = [
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
  ]
  const image = new Uint8Array(Math.max(bytes, head.length))
  image.set(head)
  return image
}

function png(bytes = 9103) {
  const image = new Uint8Array(bytes)
  image.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return image
}

const NOTHING = Symbol('nothing')

interface Route {
  when: string
  answer: Uint8Array | object | typeof NOTHING
}

let asked: string[] = []

function upstreams(...routes: Route[]) {
  asked = []
  vi.stubGlobal('fetch', async (target: string | URL) => {
    const url = String(target)
    asked.push(url)
    const route = routes.find((entry) => url.includes(entry.when))
    if (!route || route.answer === NOTHING) return new Response('weg', { status: 404 })
    if (route.answer instanceof Uint8Array) return new Response(route.answer, { status: 200 })
    return new Response(JSON.stringify(route.answer), { status: 200 })
  })
}

const thumbnail = (id: string) => ({
  items: [
    {
      volumeInfo: {
        imageLinks: {
          thumbnail: `http://books.google.com/books/content?id=${id}&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api`,
        },
      },
    },
  ],
})

const cover = (query: string) => handler(new Request(`http://localhost/api/cover?${query}`))

beforeEach(() => {
  vi.unstubAllGlobals()
  process.env.GOOGLE_BOOKS_API_KEY = 'test-key'
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.GOOGLE_BOOKS_API_KEY
})

describe('fetching a cover for a book', () => {
  it('says what is missing when neither number was given', async () => {
    upstreams()

    const answer = await cover('')

    expect(answer.status).toBe(400)
    expect(asked).toEqual([])
  })

  it('stops at the DNB when the DNB has it', async () => {
    upstreams({ when: 'portal.dnb.de', answer: jpeg(500, 800) })

    const answer = await cover('isbn=9783499256356&cover=10838632')

    expect(answer.status).toBe(200)
    expect(answer.headers.get('Content-Type')).toBe('image/jpeg')
    expect(asked).toHaveLength(1)
    expect(asked[0]).toContain('portal.dnb.de')
  })

  it('asks OpenLibrary by ISBN once the DNB is empty', async () => {
    upstreams(
      { when: 'portal.dnb.de', answer: NOTHING },
      { when: 'covers.openlibrary.org/b/isbn', answer: jpeg(260, 400, 31125) }
    )

    const answer = await cover('isbn=9780142004333&cover=999')

    expect(answer.status).toBe(200)
    expect(asked).toHaveLength(2)
  })

  it('serves a cover that is small, because a soft picture beats a painted spine', async () => {
    upstreams(
      { when: 'portal.dnb.de', answer: NOTHING },
      { when: 'covers.openlibrary.org/b/isbn', answer: NOTHING },
      { when: 'covers.openlibrary.org/b/id', answer: jpeg(145, 220, 15601) }
    )

    const answer = await cover('isbn=9781035406197&cover=15093320')

    expect(answer.status).toBe(200)
  })

  it('refuses a square, which belongs to a recording rather than a book', async () => {
    upstreams({ when: 'portal.dnb.de', answer: jpeg(500, 505) })

    const answer = await cover('isbn=9783499256356')

    expect(answer.status).toBe(404)
  })

  it('refuses a file too small to hold a cover', async () => {
    upstreams({ when: 'portal.dnb.de', answer: jpeg(39, 58, 2224) })

    const answer = await cover('isbn=9783499256356')

    expect(answer.status).toBe(404)
  })

  it('reaches past Googles placeholder to the zoom that has the picture', async () => {
    upstreams(
      { when: 'portal.dnb.de', answer: NOTHING },
      { when: 'covers.openlibrary.org', answer: NOTHING },
      { when: 'googleapis.com/books', answer: thumbnail('iYeMEAAAQBAJ') },
      { when: 'zoom=0', answer: png(9103) },
      { when: 'zoom=4', answer: jpeg(800, 1153, 466505) }
    )

    const answer = await cover('isbn=9780593197264')

    expect(answer.status).toBe(200)
    expect(asked.some((url) => url.includes('zoom=0'))).toBe(true)
    expect(asked.some((url) => url.includes('zoom=4'))).toBe(true)
    expect(asked.every((url) => !url.includes('edge=curl'))).toBe(true)
  })

  it('leaves the second zoom alone when the first already had the picture', async () => {
    upstreams(
      { when: 'portal.dnb.de', answer: NOTHING },
      { when: 'covers.openlibrary.org', answer: NOTHING },
      { when: 'googleapis.com/books', answer: thumbnail('kpDfDQAAQBAJ') },
      { when: 'zoom=0', answer: jpeg(1744, 2607, 558367) }
    )

    const answer = await cover('isbn=9780525620761')

    expect(answer.status).toBe(200)
    expect(asked.some((url) => url.includes('zoom=4'))).toBe(false)
  })

  it('skips Google entirely when no key is configured', async () => {
    delete process.env.GOOGLE_BOOKS_API_KEY
    upstreams(
      { when: 'portal.dnb.de', answer: NOTHING },
      { when: 'covers.openlibrary.org', answer: NOTHING }
    )

    const answer = await cover('isbn=9780593197264')

    expect(answer.status).toBe(404)
    expect(asked.every((url) => !url.includes('googleapis.com'))).toBe(true)
  })

  it('comes back empty when nobody has a picture', async () => {
    upstreams(
      { when: 'portal.dnb.de', answer: NOTHING },
      { when: 'covers.openlibrary.org', answer: NOTHING },
      { when: 'googleapis.com/books', answer: { items: [] } }
    )

    const answer = await cover('isbn=9781595143976&cover=6677526')

    expect(answer.status).toBe(404)
    expect(await answer.text()).toBe('kein Cover gefunden')
  })
})
