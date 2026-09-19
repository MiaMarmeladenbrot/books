export const config = { runtime: 'edge' }

const MVB_COVER = 'https://portal.dnb.de/opac/mvb/cover'
const OPENLIBRARY_COVER = 'https://covers.openlibrary.org/b/isbn'
const OPENLIBRARY_WORK_COVER = 'https://covers.openlibrary.org/b/id'
const GOOGLE_BOOKS = 'https://www.googleapis.com/books/v1/volumes'
const USER_AGENT = 'lesestapel/1.0 (private library app)'

const MIN_BYTES = 5000
const MIN_WIDTH = 280
const MIN_RATIO = 0.5
const MAX_RATIO = 0.85
const UPSTREAM_TIMEOUT = 8000
const GOOGLE_BUDGET = 2500
const GOOGLE_ZOOMS = [0, 4]

function jpegSize(bytes: Uint8Array) {
  let position = 2
  while (position < bytes.length - 9) {
    if (bytes[position] !== 0xff) {
      position += 1
      continue
    }
    const marker = bytes[position + 1]
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        height: (bytes[position + 5] << 8) | bytes[position + 6],
        width: (bytes[position + 7] << 8) | bytes[position + 8],
      }
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      position += 2
      continue
    }
    position += 2 + ((bytes[position + 2] << 8) | bytes[position + 3])
  }
  return null
}

function usable(bytes: Uint8Array) {
  if (bytes.length < MIN_BYTES) return false
  const size = jpegSize(bytes)
  if (!size || size.width < MIN_WIDTH) return false
  const ratio = size.width / size.height
  return ratio >= MIN_RATIO && ratio <= MAX_RATIO
}

async function tryFetch(url: string, timeout = UPSTREAM_TIMEOUT) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    if (!response.ok) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    return usable(bytes) ? bytes : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function googleCover(isbn: string) {
  const key = process.env.GOOGLE_BOOKS_API_KEY
  if (!key) return null

  const asked = new URLSearchParams({
    q: `isbn:${isbn}`,
    country: 'DE',
    maxResults: '1',
    fields: 'items(volumeInfo/imageLinks/thumbnail)',
    key,
  })
  try {
    const response = await fetch(`${GOOGLE_BOOKS}?${asked}`, {
      signal: AbortSignal.timeout(GOOGLE_BUDGET),
    })
    if (!response.ok) return null
    const body = (await response.json()) as {
      items?: { volumeInfo?: { imageLinks?: { thumbnail?: string } } }[]
    }
    const thumbnail = body.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
    if (!thumbnail) return null

    const picture = thumbnail.replace('http://', 'https://').replace('&edge=curl', '')
    for (const zoom of GOOGLE_ZOOMS) {
      const bytes = await tryFetch(picture.replace(/&zoom=\d+/, `&zoom=${zoom}`), GOOGLE_BUDGET)
      if (bytes) return bytes
    }
    return null
  } catch {
    return null
  }
}

export default async function handler(request: Request) {
  const parameters = new URL(request.url).searchParams
  const raw = (parameters.get('isbn') ?? '').replace(/[^0-9Xx]/g, '')
  const isbn = raw.length === 10 || raw.length === 13 ? raw : null
  const cover = (parameters.get('cover') ?? '').replace(/\D/g, '')
  if (!isbn && !cover) {
    return new Response('isbn oder cover fehlt', { status: 400 })
  }

  const bytes =
    (isbn ? await tryFetch(`${MVB_COVER}?isbn=${isbn}`) : null) ??
    (isbn ? await tryFetch(`${OPENLIBRARY_COVER}/${isbn}-L.jpg?default=false`) : null) ??
    (cover ? await tryFetch(`${OPENLIBRARY_WORK_COVER}/${cover}-L.jpg`) : null) ??
    (isbn ? await googleCover(isbn) : null)

  if (!bytes) return new Response('kein Cover gefunden', { status: 404 })

  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
