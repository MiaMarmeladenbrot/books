import { BookFormat } from '../types'

const DNB_ENDPOINT = 'https://services.dnb.de/sru/dnb'
const OPENLIBRARY_ISBN = 'https://openlibrary.org/api/books'
const OPENLIBRARY_SEARCH = 'https://openlibrary.org/search.json'
const MARC_NAMESPACE = 'http://www.loc.gov/MARC21/slim'

const FETCH_LIMIT = 20
const EXACT_LIMIT = 10
const REQUEST_TIMEOUT = 8000
const OPENLIBRARY_TIMEOUT = 4000
const LATE_ANSWER_TIMEOUT = 10000

class CatalogueUnavailable extends Error {}

async function fetchCatalogue(url: string, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new CatalogueUnavailable(String(response.status))
    return response
  } catch {
    throw new CatalogueUnavailable(url)
  } finally {
    clearTimeout(timer)
  }
}

const IMPRINT_PREFIXES = [
  'kiwi',
  'goldmann',
  'piper',
  'knaur',
  'heyne',
  'oetinger',
  'leykam',
  'dtv',
  'rowohlt',
  'rororo',
  'ullstein',
  'suhrkamp',
  'reclam',
  'diogenes',
  'btb',
  'blanvalet',
  'penguin',
  'bastei',
  'lübbe',
  'luebbe',
  'carlsen',
  'ravensburger',
  'beltz',
  'hanser',
  'klett',
  'ueberreuter',
]

const IMPRINT_EXACT = ['arena', 'insel', 'fischer', 'aufbau', 'hanser berlin', 'tropen']
const IMPRINT_ANYWHERE = ['taschenbuch', 'allgemeine reihe']

const STUDY_GUIDE_MARKERS = [
  'lektüreschlüssel',
  'königs erläuterung',
  'textanalyse',
  'interpretation',
  'unterrichtsmodell',
  'arbeitsheft',
  'lehrerband',
  'kopiervorlagen',
  'abiturwissen',
  'prüfungsaufgaben',
  'hörbuch',
  'gesprochen',
  'ungekürzte lesung',
]

export interface Candidate {
  title: string
  subtitle: string | null
  authors: string[]
  series: string | null
  series_volume: number | null
  isbn: string | null
  published_year: number | null
  page_count: number | null
  publisher: string | null
  language: string | null
  format: BookFormat | null
  cover_url: string | null
  source: 'DNB' | 'OpenLibrary'
}

const MARC_LANGUAGES: Record<string, string> = {
  ger: 'de',
  deu: 'de',
  eng: 'en',
  fre: 'fr',
  fra: 'fr',
  spa: 'es',
  ita: 'it',
  dut: 'nl',
  nld: 'nl',
  swe: 'sv',
  dan: 'da',
  nor: 'no',
  fin: 'fi',
  pol: 'pl',
  por: 'pt',
  rus: 'ru',
  tur: 'tr',
  jpn: 'ja',
  lat: 'la',
}

function languageFromMarc(code: string) {
  return MARC_LANGUAGES[code.trim().toLowerCase()] ?? null
}

export function looksLikeIsbn(input: string) {
  const digits = input.replace(/[^0-9Xx]/g, '')
  return digits.length === 10 || digits.length === 13
}

function looksLikeImprint(lowered: string) {
  if (IMPRINT_EXACT.includes(lowered)) return true
  if (IMPRINT_ANYWHERE.some((word) => lowered.includes(word))) return true
  return IMPRINT_PREFIXES.some((imprint) => {
    if (lowered === imprint) return true
    if (!lowered.startsWith(imprint)) return false
    const next = lowered.charAt(imprint.length)
    return next === '' || !/[a-zäöüß]/.test(next)
  })
}

function cleanSeries(name: string | null) {
  const trimmed = (name ?? '').replace(/[;,\s]+$/, '').trim()
  if (!trimmed || /^\d+$/.test(trimmed)) return null
  return looksLikeImprint(trimmed.toLowerCase()) ? null : trimmed
}

const STUDY_GUIDE_PATTERNS = STUDY_GUIDE_MARKERS.map(
  (marker) => new RegExp(`(^|[^\\p{L}])${marker}($|[^\\p{L}])`, 'u')
)

function looksLikeStudyGuide(text: string) {
  const lowered = text.toLowerCase()
  return STUDY_GUIDE_PATTERNS.some((pattern) => pattern.test(lowered))
}

const PRINTED_EXTENT = /\b(s\.|seite|seiten|bl\.|blatt|bll\.|p\.|pp\.|pages)/i

const VOLUME_WORDS = ['band', 'bd', 'book', 'teil', 'vol', 'nr']

const SERIES_IN_PARENS =
  /\s*\((.+?)[,\s]+(?:Band|Bd\.?|Book|Teil|Vol\.?|Nr\.?|#)?\s*(\d{1,3})\)\s*$/i

function extractSeriesFromTitle(title: string) {
  const match = title.match(SERIES_IN_PARENS)
  if (!match) return { title, series: null, volume: null }

  const name = match[1].trim().replace(/[,;:]$/, '')
  const isVolumeWord = VOLUME_WORDS.includes(name.toLowerCase().replace(/\.$/, ''))
  return {
    title: title.slice(0, match.index).trim(),
    series: isVolumeWord ? null : cleanSeries(name),
    volume: Number(match[2]),
  }
}

function flipName(name: string) {
  const cleaned = name.replace(/\s*\([^)]*\)\s*$/, '').trim()
  const parts = cleaned.split(',')
  if (parts.length !== 2) return cleaned
  return `${parts[1].trim()} ${parts[0].trim()}`.trim()
}

function firstNumber(value: string, pattern: RegExp) {
  const match = value.match(pattern)
  return match ? Number(match[1]) : null
}

function coverForIsbn(isbn: string | null, fallback: number | null = null) {
  const asked = new URLSearchParams()
  if (isbn) asked.set('isbn', isbn)
  if (fallback) asked.set('cover', String(fallback))
  return asked.size > 0 ? `/api/cover?${asked}` : null
}

const ISBN_GROUPS: Record<string, string[]> = {
  de: ['9783'],
  en: ['9780', '9781'],
}

export function pickIsbn(candidates: string[], language: string | null) {
  const thirteen = candidates.filter((value) => value.length === 13)
  const groups = language ? ISBN_GROUPS[language] : undefined
  const preferred = groups?.find((group) => thirteen.some((value) => value.startsWith(group)))
  const wanted = preferred
    ? thirteen.find((value) => value.startsWith(preferred))
    : thirteen.find(Boolean)
  return wanted ?? null
}

function fields(record: Element, tag: string) {
  return [...record.getElementsByTagNameNS('*', 'datafield')].filter(
    (field) => field.getAttribute('tag') === tag
  )
}

function subfield(field: Element, code: string) {
  const match = [...field.getElementsByTagNameNS('*', 'subfield')].find(
    (entry) => entry.getAttribute('code') === code
  )
  return (match?.textContent ?? '').trim().normalize('NFC')
}

const PRODUCT_FORM = '(Produktform)'

const BINDING_WORDS: [string, BookFormat][] = [
  ['hardback', BookFormat.Hardcover],
  ['festeinband', BookFormat.Hardcover],
  ['gebunden', BookFormat.Hardcover],
  ['leinen', BookFormat.Hardcover],
  ['paperback', BookFormat.Paperback],
  ['softback', BookFormat.Paperback],
  ['broschur', BookFormat.Paperback],
  ['broschiert', BookFormat.Paperback],
  ['kartoniert', BookFormat.Paperback],
  ['taschenbuch', BookFormat.Paperback],
  ['electronic book', BookFormat.Ebook],
  ['epub', BookFormat.Ebook],
  ['audio', BookFormat.Audiobook],
]

function formatFromRecord(record: Element) {
  const spoken = fields(record, '336').some((field) =>
    subfield(field, 'a').toLowerCase().includes('gesprochen')
  )
  if (spoken) return BookFormat.Audiobook

  const carriers = fields(record, '338').map((field) => subfield(field, 'b'))
  if (carriers.some((code) => code.startsWith('s'))) return BookFormat.Audiobook
  if (carriers.includes('cr')) return BookFormat.Ebook

  const stated = [
    ...fields(record, '653')
      .map((field) => subfield(field, 'a'))
      .filter((value) => value.startsWith(PRODUCT_FORM))
      .map((value) => value.slice(PRODUCT_FORM.length)),
    ...fields(record, '020').map((field) => subfield(field, 'c')),
  ].map((value) => value.toLowerCase())

  for (const value of stated) {
    const match = BINDING_WORDS.find(([word]) => value.includes(word))
    if (match) return match[1]
  }
  return null
}

function isAdditionalAuthor(field: Element) {
  if (subfield(field, 't')) return false
  const relator = subfield(field, '4')
  return relator === '' || relator === 'aut'
}

function parseDnbRecord(record: Element): Candidate | null {
  const titleField = fields(record, '245')[0]
  const rawTitle = titleField ? subfield(titleField, 'a').replace(/\s*[/:]$/, '').trim() : ''
  if (!rawTitle) return null

  const fromTitle = extractSeriesFromTitle(rawTitle)
  const title = fromTitle.title || rawTitle

  const authors = [
    ...new Set(
      [...fields(record, '100'), ...fields(record, '700').filter(isAdditionalAuthor)]
        .map((field) => flipName(subfield(field, 'a')))
        .filter(Boolean)
    ),
  ]

  let pages: number | null = null
  for (const field of fields(record, '300')) {
    const extent = subfield(field, 'a')
    if (!PRINTED_EXTENT.test(extent)) continue
    pages = firstNumber(extent, /(\d{2,4})/)
    if (pages) break
  }

  let year: number | null = null
  let publisher: string | null = null
  for (const tag of ['264', '260']) {
    for (const field of fields(record, tag)) {
      year = year ?? firstNumber(subfield(field, 'c'), /(1[4-9]\d{2}|20[0-4]\d)/)
      publisher = publisher || subfield(field, 'b').replace(/[,;:]\s*$/, '').trim() || null
    }
  }

  let series: string | null = fromTitle.series
  let volume: number | null = fromTitle.volume
  for (const tag of series ? [] : ['490', '830']) {
    for (const field of fields(record, tag)) {
      const candidate = cleanSeries(subfield(field, 'a'))
      if (candidate) {
        series = candidate
        volume = firstNumber(subfield(field, 'v'), /(\d{1,3})/)
        break
      }
    }
    if (series) break
  }

  const isbn =
    fields(record, '020')
      .map((field) => subfield(field, 'a').replace(/\D/g, ''))
      .find((value) => value.length === 13 || value.length === 10) ?? null

  const language = fields(record, '041')
    .map((field) => languageFromMarc(subfield(field, 'a')))
    .find((code) => code !== null)

  return {
    title,
    subtitle: titleField ? subfield(titleField, 'b').replace(/\s*[/:]$/, '').trim() || null : null,
    authors,
    series,
    series_volume: volume,
    isbn,
    published_year: year,
    page_count: pages,
    publisher,
    language: language ?? null,
    format: formatFromRecord(record),
    cover_url: coverForIsbn(isbn),
    source: 'DNB',
  }
}

interface DnbResult {
  candidates: Candidate[]
  total: number
}

async function searchDnb(query: string, limit: number): Promise<DnbResult> {
  const parameters = new URLSearchParams({
    version: '1.1',
    operation: 'searchRetrieve',
    query,
    recordSchema: 'MARC21-xml',
    maximumRecords: String(limit),
  })

  const response = await fetchCatalogue(`${DNB_ENDPOINT}?${parameters}`)
  const document = new DOMParser().parseFromString(await response.text(), 'application/xml')
  if (document.getElementsByTagName('parsererror').length > 0) return { candidates: [], total: 0 }

  const candidates = [...document.getElementsByTagNameNS(MARC_NAMESPACE, 'record')]
    .map(parseDnbRecord)
    .filter((candidate): candidate is Candidate => candidate !== null)
    .filter((candidate) => !looksLikeStudyGuide(`${candidate.title} ${candidate.subtitle ?? ''}`))

  const reported = document.getElementsByTagNameNS('*', 'numberOfRecords')[0]?.textContent
  return { candidates, total: Number(reported ?? candidates.length) }
}

async function searchOpenLibraryIsbn(isbn: string): Promise<Candidate[]> {
  const parameters = new URLSearchParams({
    bibkeys: `ISBN:${isbn}`,
    format: 'json',
    jscmd: 'data',
  })
  const response = await fetchCatalogue(`${OPENLIBRARY_ISBN}?${parameters}`, OPENLIBRARY_TIMEOUT)
  const record = (await response.json())[`ISBN:${isbn}`]
  if (!record?.title) return []

  return [
    {
      title: String(record.title).trim(),
      subtitle: record.subtitle ? String(record.subtitle).trim() : null,
      authors: (record.authors ?? []).map((author: { name: string }) => author.name),
      series: cleanSeries(record.series?.[0]?.name ?? null),
      series_volume: null,
      isbn,
      published_year: firstNumber(String(record.publish_date ?? ''), /(1[4-9]\d{2}|20[0-4]\d)/),
      page_count: record.number_of_pages ?? null,
      publisher: record.publishers?.[0]?.name ?? null,
      language: null,
      format: null,
      cover_url: coverForIsbn(isbn),
      source: 'OpenLibrary',
    },
  ]
}

async function searchOpenLibraryText(text: string, limit: number): Promise<Candidate[]> {
  const parameters = new URLSearchParams({
    q: text,
    fields:
      'title,subtitle,author_name,first_publish_year,number_of_pages_median,publisher,isbn,' +
      'cover_i,language',
    limit: String(limit),
  })
  const response = await fetchCatalogue(`${OPENLIBRARY_SEARCH}?${parameters}`, LATE_ANSWER_TIMEOUT)
  const documents: Record<string, unknown>[] = (await response.json()).docs ?? []
  return documents
    .map((document) => {
      const isbnList = (document.isbn as string[]) ?? []
      const coverId = (document.cover_i as number | undefined) ?? null
      const language =
        ((document.language as string[]) ?? [])
          .map(languageFromMarc)
          .find((code) => code !== null) ?? null
      const isbn = pickIsbn(isbnList, language)
      return {
        title: String(document.title ?? '').trim(),
        subtitle: document.subtitle ? String(document.subtitle).trim() : null,
        authors: ((document.author_name as string[]) ?? []).slice(0, 3),
        series: null,
        series_volume: null,
        isbn,
        published_year: (document.first_publish_year as number) ?? null,
        page_count: (document.number_of_pages_median as number) ?? null,
        publisher: ((document.publisher as string[]) ?? [])[0] ?? null,
        language,
        format: null,
        cover_url: coverForIsbn(isbn, coverId),
        source: 'OpenLibrary' as const,
      }
    })
    .filter((candidate) => candidate.title.length > 0)
    .filter((candidate) => !looksLikeStudyGuide(candidate.title))
}

function normalizeText(text: string) {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const TITLE_EXACT = 100
const TITLE_EDGE = 60
const TITLE_WORDS = 30
const AUTHOR_MATCH = 50
const HAS_EXTENT = 6
const HAS_ISBN = 4
const HAS_FORMAT = 3

function scoreCandidate(candidate: Candidate, query: string, words: string[]) {
  const title = normalizeText(candidate.title)
  let points = 0

  if (title === query) points += TITLE_EXACT
  else if (title.startsWith(query) || query.startsWith(title)) points += TITLE_EDGE
  else if (words.every((word) => title.includes(word))) points += TITLE_WORDS

  const authors = normalizeText(candidate.authors.join(' '))
  if (authors && words.some((word) => word.length > 2 && authors.includes(word))) {
    points += AUTHOR_MATCH
  }

  if (candidate.page_count) points += HAS_EXTENT
  if (candidate.isbn) points += HAS_ISBN
  if (candidate.format) points += HAS_FORMAT

  return points
}

export function rankCandidates(candidates: Candidate[], input: string) {
  const query = normalizeText(input)
  const words = query.split(' ').filter(Boolean)
  return candidates
    .map((candidate) => ({ candidate, points: scoreCandidate(candidate, query, words) }))
    .sort((left, right) => right.points - left.points)
    .map((entry) => entry.candidate)
}

const WORDS_SUGGEST_A_NAME = 3

function dnbQueries(input: string) {
  const phrase = input.replace(/"/g, '').trim()
  const words = normalizeText(input)
    .split(' ')
    .filter((word) => word.length > 1)
  const broad =
    words.length >= WORDS_SUGGEST_A_NAME
      ? words.map((word) => `WOE=${word}`).join(' and ')
      : `tit="${phrase}"`
  return { exact: `tst="${phrase}"`, broad }
}

function dedupe(candidates: Candidate[]) {
  const seen = new Set<string>()
  const named = new Set<string>()
  return candidates.filter((candidate) => {
    const book = [
      normalizeText(candidate.title),
      normalizeText(candidate.authors.join(' ')),
      candidate.published_year ?? '',
    ].join('|')
    if (!candidate.format && named.has(book)) return false

    const key = `${book}|${candidate.format ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    named.add(book)
    return true
  })
}

export interface Lookup {
  query: 'isbn' | 'text'
  results: Candidate[]
  asked: number
  silent: number
  moreAvailable: boolean
}

const CACHE_LIMIT = 30
const answered = new Map<string, Lookup>()

function remember(key: string, lookup: Lookup) {
  if (lookup.results.length === 0 || lookup.silent > 0) return lookup
  answered.set(key, lookup)
  const oldest = answered.keys().next()
  if (answered.size > CACHE_LIMIT && !oldest.done) answered.delete(oldest.value)
  return lookup
}

export async function lookupBooks(
  input: string,
  onFirstAnswer?: (lookup: Lookup) => void
): Promise<Lookup> {
  const trimmed = input.trim()
  const key = trimmed.toLowerCase()
  const known = answered.get(key)
  if (known) return known

  if (looksLikeIsbn(trimmed)) {
    const isbn = trimmed.replace(/[^0-9Xx]/g, '')
    let asked = 0
    let silent = 0
    const sources = [
      async () => (await searchDnb(`num=${isbn}`, 1)).candidates,
      () => searchOpenLibraryIsbn(isbn),
    ]
    for (const search of sources) {
      asked += 1
      try {
        const found = await search()
        if (found.length > 0) {
          const results = found.map((candidate) => ({ ...candidate, isbn }))
          return remember(key, { query: 'isbn', results, asked, silent, moreAvailable: false })
        }
      } catch {
        silent += 1
      }
    }
    return { query: 'isbn', results: [], asked, silent, moreAvailable: false }
  }

  const { exact, broad } = dnbQueries(trimmed)
  const empty = { candidates: [], total: 0 }
  const slowly = searchOpenLibraryText(trimmed, FETCH_LIMIT).catch(() => null)
  const promptly = await Promise.allSettled([
    searchDnb(exact, EXACT_LIMIT),
    searchDnb(broad, FETCH_LIMIT),
  ])

  const byTitle = promptly[0].status === 'fulfilled' ? promptly[0].value : empty
  const byWords = promptly[1].status === 'fulfilled' ? promptly[1].value : empty
  const fromDnb = [...byTitle.candidates, ...byWords.candidates]
  const moreAvailable = byTitle.total + byWords.total > fromDnb.length
  const silent = promptly.filter((outcome) => outcome.status === 'rejected').length

  const asked = promptly.length + 1

  if (onFirstAnswer && fromDnb.length > 0) {
    onFirstAnswer({
      query: 'text',
      results: dedupe(rankCandidates(fromDnb, trimmed)),
      asked,
      silent,
      moreAvailable,
    })
  }

  const fromOpenLibrary = await slowly

  return remember(key, {
    query: 'text',
    results: dedupe(rankCandidates([...fromDnb, ...(fromOpenLibrary ?? [])], trimmed)),
    asked,
    silent: silent + (fromOpenLibrary === null ? 1 : 0),
    moreAvailable,
  })
}
