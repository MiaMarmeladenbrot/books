import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from './books.ts'

let asked: string[] = []

function google(answer: object | number = { items: [] }) {
  asked = []
  vi.stubGlobal('fetch', async (target: string | URL) => {
    asked.push(String(target))
    if (typeof answer === 'number') return new Response('nope', { status: answer })
    return new Response(JSON.stringify(answer), { status: 200 })
  })
}

const sent = () => new URL(asked[0]).searchParams

const books = (query: string) => handler(new Request(`http://localhost/api/books?${query}`))

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
