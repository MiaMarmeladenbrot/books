export const config = { runtime: 'edge' }

const GOOGLE_BOOKS = 'https://www.googleapis.com/books/v1/volumes'
const FIELDS =
  'items(volumeInfo(title,subtitle,authors,publishedDate,pageCount,publisher,language,' +
  'industryIdentifiers,imageLinks/thumbnail))'
const UPSTREAM_TIMEOUT = 8000

export default async function handler(request: Request) {
  const parameters = new URL(request.url).searchParams
  const raw = (parameters.get('isbn') ?? '').replace(/[^0-9Xx]/g, '')
  const isbn = raw.length === 10 || raw.length === 13 ? raw : null
  if (!isbn) {
    return new Response('isbn fehlt', { status: 400 })
  }

  const key = process.env.GOOGLE_BOOKS_API_KEY
  if (!key) return new Response('GOOGLE_BOOKS_API_KEY fehlt', { status: 503 })

  const asked = new URLSearchParams({
    q: `isbn:${isbn}`,
    country: 'DE',
    maxResults: '1',
    fields: FIELDS,
    key,
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT)
  try {
    const response = await fetch(`${GOOGLE_BOOKS}?${asked}`, { signal: controller.signal })
    if (!response.ok) return new Response('Google Books antwortet nicht', { status: 502 })
    return new Response(await response.text(), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return new Response('Google Books antwortet nicht', { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
