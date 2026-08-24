const DNB_ENDPOINT = 'https://services.dnb.de/sru/dnb'
const OPENLIBRARY_ISBN = 'https://openlibrary.org/api/books'
const OPENLIBRARY_SEARCH = 'https://openlibrary.org/search.json'
const OPENLIBRARY_COVER = 'https://covers.openlibrary.org/b'
const MARC_NAMESPACE = 'http://www.loc.gov/MARC21/slim'

const FETCH_LIMIT = 20
const REQUEST_TIMEOUT = 8000

class CatalogueUnavailable extends Error {}

async function fetchCatalogue(url: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
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
  cover_url: string | null
  source: 'DNB' | 'OpenLibrary'
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

function coverForIsbn(isbn: string | null) {
  return isbn ? `/api/cover?isbn=${isbn}` : null
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
  return (match?.textContent ?? '').trim()
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
  const response = await fetchCatalogue(`${OPENLIBRARY_ISBN}?${parameters}`)
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
      cover_url: coverForIsbn(isbn),
      source: 'OpenLibrary',
    },
  ]
}

async function searchOpenLibraryText(text: string, limit: number): Promise<Candidate[]> {
  const parameters = new URLSearchParams({
    q: text,
    fields:
      'title,subtitle,author_name,first_publish_year,number_of_pages_median,publisher,isbn,cover_i',
    limit: String(limit),
  })
  const response = await fetchCatalogue(`${OPENLIBRARY_SEARCH}?${parameters}`)
  const documents: Record<string, unknown>[] = (await response.json()).docs ?? []
  return documents
    .map((document) => {
      const isbnList = (document.isbn as string[]) ?? []
      const coverId = document.cover_i as number | undefined
      return {
        title: String(document.title ?? '').trim(),
        subtitle: document.subtitle ? String(document.subtitle).trim() : null,
        authors: ((document.author_name as string[]) ?? []).slice(0, 3),
        series: null,
        series_volume: null,
        isbn: isbnList.find((value) => value.length === 13) ?? null,
        published_year: (document.first_publish_year as number) ?? null,
        page_count: (document.number_of_pages_median as number) ?? null,
        publisher: ((document.publisher as string[]) ?? [])[0] ?? null,
        cover_url: coverId ? `${OPENLIBRARY_COVER}/id/${coverId}-L.jpg` : null,
        source: 'OpenLibrary' as const,
      }
    })
    .filter((candidate) => candidate.title.length > 0)
    .filter((candidate) => !looksLikeStudyGuide(candidate.title))
}

function interleave(first: Candidate[], second: Candidate[]) {
  const mixed: Candidate[] = []
  for (let index = 0; index < Math.max(first.length, second.length); index += 1) {
    if (first[index]) mixed.push(first[index])
    if (second[index]) mixed.push(second[index])
  }
  return mixed
}

function dedupe(candidates: Candidate[]) {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    const key = `${candidate.title.toLowerCase()}|${candidate.published_year ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function lookupBooks(input: string) {
  const trimmed = input.trim()

  if (looksLikeIsbn(trimmed)) {
    const isbn = trimmed.replace(/[^0-9Xx]/g, '')
    let silent = 0
    const sources = [
      async () => (await searchDnb(`num=${isbn}`, 1)).candidates,
      () => searchOpenLibraryIsbn(isbn),
    ]
    for (const search of sources) {
      try {
        const found = await search()
        if (found.length > 0) {
          const results = found.map((candidate) => ({ ...candidate, isbn }))
          return { query: 'isbn' as const, results, silent, moreAvailable: false }
        }
      } catch {
        silent += 1
      }
    }
    return { query: 'isbn' as const, results: [], silent, moreAvailable: false }
  }

  const outcomes = await Promise.allSettled([
    searchDnb(`tit="${trimmed.replace(/"/g, '')}"`, FETCH_LIMIT),
    searchOpenLibraryText(trimmed, FETCH_LIMIT),
  ])
  const dnb = outcomes[0].status === 'fulfilled' ? outcomes[0].value : { candidates: [], total: 0 }
  const openLibrary = outcomes[1].status === 'fulfilled' ? outcomes[1].value : []

  return {
    query: 'text' as const,
    results: dedupe(interleave(dnb.candidates, openLibrary)),
    silent: outcomes.filter((outcome) => outcome.status === 'rejected').length,
    moreAvailable: dnb.total > dnb.candidates.length,
  }
}
