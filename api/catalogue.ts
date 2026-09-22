import { cleanSeries, storyVolume } from './_imprint.ts'

export const config = { runtime: 'edge' }

const DNB_SRU = 'https://services.dnb.de/sru/dnb'
const GOOGLE_BOOKS = 'https://www.googleapis.com/books/v1/volumes'
const USER_AGENT = 'lesestapel/1.0 (private library app)'

const UPSTREAM_TIMEOUT = 5000
const MIN_LENGTH = 120
const BLURB_KIND = /inhaltstext|klappentext/i
const PRINTED_EXTENT = /(\d{2,4})\s*(?:S\.|Seiten|pages|p\.)/i
const PRINTED_YEAR = /(1[4-9]\d{2}|20[0-4]\d)/

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
  sbquo: '‚',
  lsquo: '‘',
  rsquo: '’',
  laquo: '«',
  raquo: '»',
  shy: '',
}

interface Found {
  text: string | null
  pages: number | null
  year: number | null
  series: string | null
  volume: number | null
}

const NOTHING: Found = { text: null, pages: null, year: null, series: null, volume: null }

function decode(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code.startsWith('#')) {
      const point = code.startsWith('#x') ? parseInt(code.slice(2), 16) : Number(code.slice(1))
      return Number.isFinite(point) && point > 0 ? String.fromCodePoint(point) : whole
    }
    return ENTITIES[code.toLowerCase()] ?? whole
  })
}

function plain(html: string) {
  return decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<\s*br\s*\/?>|<\s*\/?\s*(p|div|li|tr|h[1-6])\b[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
  )
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n+/g, '\n')
    .trim()
}

async function tryFetch(url: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT)
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function marcFields(xml: string, tag: string) {
  const out: Record<string, string>[] = []
  const pattern = new RegExp(
    `<[^>]*datafield[^>]*tag="${tag}"[^>]*>([\\s\\S]*?)</[^>]*datafield>`,
    'g'
  )
  for (const [, field] of xml.matchAll(pattern)) {
    const codes: Record<string, string> = {}
    for (const [, code, value] of field.matchAll(
      /<[^>]*subfield[^>]*code="([^"]+)"[^>]*>([\s\S]*?)<\/[^>]*subfield>/g
    )) {
      if (codes[code] === undefined) codes[code] = decode(value).replace(/\s+/g, ' ').trim()
    }
    out.push(codes)
  }
  return out
}

function firstNumber(value: string | undefined, pattern: RegExp) {
  const match = pattern.exec(value ?? '')
  return match ? Number(match[1]) : null
}

function seriesFromRecord(xml: string) {
  for (const codes of [...marcFields(xml, '490'), ...marcFields(xml, '830')]) {
    const name = cleanSeries(codes.a?.normalize('NFC') ?? null)
    if (!name) continue
    const volume = storyVolume(codes.v ?? null)
    if (volume === null) continue
    return { series: name, volume }
  }
  return { series: null, volume: null }
}

function blurbLink(xml: string) {
  for (const codes of marcFields(xml, '856')) {
    if (BLURB_KIND.test(codes['3'] ?? '') && codes.u?.startsWith('https://')) return codes.u
  }
  return null
}

async function fromDnb(isbn: string): Promise<Found> {
  const asked = new URLSearchParams({
    version: '1.1',
    operation: 'searchRetrieve',
    query: `num=${isbn}`,
    recordSchema: 'MARC21-xml',
    maximumRecords: '1',
  })
  const xml = await tryFetch(`${DNB_SRU}?${asked}`)
  if (!xml) return NOTHING

  const link = blurbLink(xml)
  const page = link ? await tryFetch(link) : null

  return {
    text: page ? plain(page) : null,
    pages: firstNumber(marcFields(xml, '300')[0]?.a, PRINTED_EXTENT),
    year: firstNumber(marcFields(xml, '264')[0]?.c, PRINTED_YEAR),
    ...seriesFromRecord(xml),
  }
}

async function fromGoogle(isbn: string): Promise<Found> {
  const key = process.env.GOOGLE_BOOKS_API_KEY
  if (!key) return NOTHING

  const asked = new URLSearchParams({
    q: `isbn:${isbn}`,
    country: 'DE',
    maxResults: '1',
    fields: 'items(volumeInfo(description,pageCount,publishedDate))',
    key,
  })
  const body = await tryFetch(`${GOOGLE_BOOKS}?${asked}`)
  if (!body) return NOTHING

  try {
    const volumes = JSON.parse(body) as {
      items?: { volumeInfo?: { description?: string; pageCount?: number; publishedDate?: string } }[]
    }
    const volume = volumes.items?.[0]?.volumeInfo
    if (!volume) return NOTHING
    return {
      ...NOTHING,
      text: volume.description ? plain(volume.description) : null,
      pages: volume.pageCount && volume.pageCount > 0 ? volume.pageCount : null,
      year: firstNumber(volume.publishedDate, PRINTED_YEAR),
    }
  } catch {
    return NOTHING
  }
}

const SOURCES = { DNB: fromDnb, Google: fromGoogle } as const

export default async function handler(request: Request) {
  const parameters = new URL(request.url).searchParams
  const raw = (parameters.get('isbn') ?? '').replace(/[^0-9Xx]/g, '')
  const isbn = raw.length === 10 || raw.length === 13 ? raw : null
  if (!isbn) return new Response('isbn fehlt', { status: 400 })

  const english = (parameters.get('lang') ?? '').toLowerCase() === 'en'
  const order: (keyof typeof SOURCES)[] = english ? ['Google', 'DNB'] : ['DNB', 'Google']

  const answer: Found & { source: string | null } = { ...NOTHING, source: null }

  for (const name of order) {
    const found = await SOURCES[name](isbn)

    if (!answer.text && found.text && found.text.length >= MIN_LENGTH) {
      answer.text = found.text
      answer.source = name
    }
    answer.pages ??= found.pages
    answer.year ??= found.year
    if (!answer.series && found.series) {
      answer.series = found.series
      answer.volume = found.volume
    }

    if (answer.text && answer.pages !== null) break
  }

  if (!answer.text && answer.pages === null && answer.year === null) {
    return new Response('nichts über diese ISBN gefunden', {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  }

  return Response.json(answer, {
    headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=2592000' },
  })
}
