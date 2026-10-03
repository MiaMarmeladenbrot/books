export const config = { runtime: 'edge' }

const GOOGLE_BOOKS = 'https://www.googleapis.com/books/v1/volumes'
const FIELDS =
  'items(volumeInfo(title,subtitle,authors,publishedDate,pageCount,publisher,language,' +
  'industryIdentifiers,imageLinks/thumbnail))'
const UPSTREAM_BUDGET = 3500
const WORTH_ASKING_AGAIN = 1000
const MAX_RESULTS = 10

interface Answer {
  items?: { volumeInfo?: { industryIdentifiers?: unknown[] } }[]
}

function lacksEveryIsbn(answer: Answer) {
  const items = answer.items ?? []
  return items.length > 0 && items.every((item) => !item.volumeInfo?.industryIdentifiers?.length)
}

async function ask(asked: URLSearchParams, deadline: number): Promise<Answer | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), deadline - Date.now())
  try {
    const response = await fetch(`${GOOGLE_BOOKS}?${asked}`, { signal: controller.signal })
    return response.ok ? ((await response.json()) as Answer) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(request: Request) {
  const parameters = new URL(request.url).searchParams
  const raw = (parameters.get('isbn') ?? '').replace(/[^0-9Xx]/g, '')
  const isbn = raw.length === 10 || raw.length === 13 ? raw : null
  const text = (parameters.get('q') ?? '').trim()
  if (!isbn && !text) {
    return new Response('isbn oder q fehlt', { status: 400 })
  }

  const key = process.env.GOOGLE_BOOKS_API_KEY
  if (!key) return new Response('GOOGLE_BOOKS_API_KEY fehlt', { status: 503 })

  const wanted = Number(parameters.get('limit') ?? '')
  const limit = Number.isInteger(wanted) && wanted > 0 ? Math.min(wanted, MAX_RESULTS) : MAX_RESULTS
  const asked = new URLSearchParams({
    q: isbn ? `isbn:${isbn}` : text,
    country: 'DE',
    maxResults: String(isbn ? 1 : limit),
    fields: FIELDS,
    key,
  })

  const deadline = Date.now() + UPSTREAM_BUDGET
  let answer = await ask(asked, deadline)
  const timeLeft = deadline - Date.now()
  if (answer && !isbn && lacksEveryIsbn(answer) && timeLeft >= WORTH_ASKING_AGAIN) {
    answer = (await ask(asked, deadline)) ?? answer
  }
  if (!answer) return new Response('Google Books antwortet nicht', { status: 502 })

  return new Response(JSON.stringify(answer), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
