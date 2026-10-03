import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from './books.ts'

let asked: string[] = []

function google(...answers: (object | number)[]) {
  asked = []
  vi.stubGlobal('fetch', async (target: string | URL) => {
    asked.push(String(target))
    const answer = answers[Math.min(asked.length, answers.length) - 1] ?? { items: [] }
    if (typeof answer === 'number') return new Response('nope', { status: answer })
    return new Response(JSON.stringify(answer), { status: 200 })
  })
}

const sent = () => new URL(asked[0]).searchParams

const books = (query: string) => handler(new Request(`http://localhost/api/books?${query}`))

const numbered = {
  items: [
    {
      volumeInfo: {
        title: 'Mandorla amara',
        industryIdentifiers: [{ type: 'ISBN_13', identifier: '9788806264697' }],
      },
    },
  ],
}
const unnumbered = { items: [{ volumeInfo: { title: 'Mandorla amara' } }] }

beforeEach(() => {
  vi.unstubAllGlobals()
  process.env.GOOGLE_BOOKS_API_KEY = 'test-key'
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.GOOGLE_BOOKS_API_KEY
})

describe('asking Google Books through our own door', () => {
  it('says what is missing when asked for nothing', async () => {
    google()

    const answer = await books('')

    expect(answer.status).toBe(400)
    expect(asked).toEqual([])
  })

  it('turns an ISBN into the query Google wants, and asks for one book', async () => {
    google({ items: [{ volumeInfo: { title: 'Tschick' } }] })

    const answer = await books('isbn=978-3-499-25635-6')

    expect(answer.status).toBe(200)
    expect(sent().get('q')).toBe('isbn:9783499256356')
    expect(sent().get('maxResults')).toBe('1')
  })

  it('passes a title through, because the search asks by title too', async () => {
    google()

    const answer = await books('q=Tschick+Herrndorf&limit=10')

    expect(answer.status).toBe(200)
    expect(sent().get('q')).toBe('Tschick Herrndorf')
    expect(sent().get('maxResults')).toBe('10')
  })

  it('keeps the key on this side of the wall', async () => {
    google()

    const answer = await books('q=Tschick')

    expect(sent().get('key')).toBe('test-key')
    expect(await answer.text()).not.toContain('test-key')
  })

  it('never asks Google for more than it is willing to hand over', async () => {
    google()
    await books('q=Tschick&limit=999')
    expect(sent().get('maxResults')).toBe('10')

    google()
    await books('q=Tschick&limit=abc')
    expect(sent().get('maxResults')).toBe('10')

    google()
    await books('q=Tschick&limit=0')
    expect(sent().get('maxResults')).toBe('10')

    google()
    await books('q=Tschick&limit=3')
    expect(sent().get('maxResults')).toBe('3')
  })

  it('lets every visitor share the answer for an hour', async () => {
    google(numbered)

    const answer = await books('q=Mandorla+amara')

    expect(answer.headers.get('Cache-Control')).toContain('s-maxage=3600')
  })

  it('asks once more when Google left every ISBN out of a title search', async () => {
    google(unnumbered, numbered)

    const answer = await books('q=Mandorla+amara')

    expect(asked).toHaveLength(2)
    expect(await answer.json()).toEqual(numbered)
  })

  it('asks no more than once more, and keeps the first answer if the second fails', async () => {
    google(unnumbered, 503)

    const answer = await books('q=Mandorla+amara')

    expect(asked).toHaveLength(2)
    expect(answer.status).toBe(200)
    expect(await answer.json()).toEqual(unnumbered)
  })

  it('does not ask again when the ISBNs are there, or nothing was found', async () => {
    google(numbered)
    await books('q=Mandorla+amara')
    expect(asked).toHaveLength(1)

    google({})
    await books('q=Mandorla+amara')
    expect(asked).toHaveLength(1)
  })

  it('does not ask again when the first answer took too long for a second one', async () => {
    vi.useFakeTimers()
    asked = []
    vi.stubGlobal('fetch', async (target: string | URL) => {
      asked.push(String(target))
      await new Promise((resolve) => setTimeout(resolve, 3000))
      return new Response(JSON.stringify(unnumbered), { status: 200 })
    })

    const pending = books('q=Mandorla+amara')
    await vi.advanceTimersByTimeAsync(5000)
    const answer = await pending
    vi.useRealTimers()

    expect(asked).toHaveLength(1)
    expect(answer.status).toBe(200)
  })

  it('gives up on Google before the app gives up on us', async () => {
    vi.useFakeTimers()
    let abortedAt: number | null = null
    const started = Date.now()
    vi.stubGlobal('fetch', (_target: string | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          abortedAt = Date.now() - started
          reject(new DOMException('', 'AbortError'))
        })
      })
    })

    const pending = books('isbn=9783499256356')
    await vi.advanceTimersByTimeAsync(10000)
    const answer = await pending
    vi.useRealTimers()

    expect(answer.status).toBe(502)
    expect(abortedAt).toBeLessThan(4000)
  })

  it('does not ask again for a scanned number, which carries its own ISBN', async () => {
    google(unnumbered)

    await books('isbn=9788806264697')

    expect(asked).toHaveLength(1)
  })

  it('says so plainly when no key is configured', async () => {
    delete process.env.GOOGLE_BOOKS_API_KEY
    google()

    const answer = await books('isbn=9783499256356')

    expect(answer.status).toBe(503)
    expect(asked).toEqual([])
  })

  it('does not pass Googles own failure on as our own', async () => {
    google(429)

    const answer = await books('isbn=9783499256356')

    expect(answer.status).toBe(502)
  })
})
