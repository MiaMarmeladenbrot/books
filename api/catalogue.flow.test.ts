import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from './catalogue.ts'

const NOTHING = Symbol('nothing')

interface Route {
  when: string
  answer: string | object | typeof NOTHING
}

let asked: string[] = []

function upstreams(...routes: Route[]) {
  asked = []
  vi.stubGlobal('fetch', async (target: string | URL) => {
    const url = String(target)
    asked.push(url)
    const route = routes.find((entry) => url.includes(entry.when))
    if (!route || route.answer === NOTHING) return new Response('weg', { status: 404 })
    if (typeof route.answer === 'string') return new Response(route.answer, { status: 200 })
    return new Response(JSON.stringify(route.answer), { status: 200 })
  })
}

interface RecordParts {
  blurbUrl?: string
  tocUrl?: string
  extent?: string
  year?: string
  series?: { name: string; volume?: string; tag?: '490' | '830' }
}

function record({ blurbUrl, tocUrl, extent, year, series }: RecordParts) {
  const link = (kind: string, url: string) =>
    `<datafield tag="856" ind1="4" ind2="2"><subfield code="3">${kind}</subfield>` +
    `<subfield code="u">${url}</subfield></datafield>`

  const parts = [
    '<datafield tag="245"><subfield code="a">Ein Titel</subfield></datafield>',
    blurbUrl ? link('Inhaltstext', blurbUrl) : '',
    tocUrl ? link('Inhaltsverzeichnis', tocUrl) : '',
    extent ? `<datafield tag="300"><subfield code="a">${extent}</subfield></datafield>` : '',
    year ? `<datafield tag="264"><subfield code="c">${year}</subfield></datafield>` : '',
    series
      ? `<datafield tag="${series.tag ?? '490'}"><subfield code="a">${series.name}</subfield>` +
        (series.volume ? `<subfield code="v">${series.volume}</subfield>` : '') +
        '</datafield>'
      : '',
  ]

  return (
    '<?xml version="1.0"?><searchRetrieveResponse><records><record><recordData><record>' +
    parts.join('') +
    '</record></recordData></record></records></searchRetrieveResponse>'
  )
}

const LONG = 'Ein Satz über das Buch, der lang genug ist, um als Klappentext zu zählen. '.repeat(3)

const blurbPage = (text: string) =>
  `<html><head></head><body><div style="font-size:14px">${text}</div></body></html>`

const google = (volume: object) => ({ items: [{ volumeInfo: volume }] })

interface Answer {
  text: string | null
  source: string | null
  pages: number | null
  year: number | null
  series: string | null
  volume: number | null
}

const ask = (query: string) => handler(new Request(`http://localhost/api/catalogue?${query}`))

const read = async (response: Response) => (await response.json()) as Answer

const BLURB = 'https://services.dnb.de/plus/idn/1/blurb/'

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubEnv('GOOGLE_BOOKS_API_KEY', 'schluessel')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('api/catalogue', () => {
  it('follows the Inhaltstext link and reads the facts from the same record', async () => {
    upstreams(
      {
        when: 'services.dnb.de/sru',
        answer: record({
          blurbUrl: BLURB,
          extent: '233 Seiten',
          year: '[2023]',
          series: { name: 'Winge und Cardell ermitteln', volume: 'Band 2' },
        }),
      },
      { when: '/blurb/', answer: blurbPage(`${LONG}<br /><br />Zweiter Absatz &amp; mehr`) }
    )

    const response = await ask('isbn=9783492317948')
    const body = await read(response)

    expect(response.status).toBe(200)
    expect(body.source).toBe('DNB')
    expect(body.text).not.toContain('<')
    expect(body.text?.split('\n')).toEqual([LONG.trim(), 'Zweiter Absatz & mehr'])
    expect(body.pages).toBe(233)
    expect(body.year).toBe(2023)
    expect(body.series).toBe('Winge und Cardell ermitteln')
    expect(body.volume).toBe(2)
  })

  it('breaks a paragraph on the self-closing tag the DNB separates with', async () => {
    upstreams(
      { when: 'services.dnb.de/sru', answer: record({ blurbUrl: BLURB, extent: '288 Seiten' }) },
      {
        when: '/blurb/',
        answer: blurbPage(`${LONG}<p />Deutscher Buchpreis 2024<p />Prix Grand Continent`),
      }
    )

    const body = await read(await ask('isbn=9783328113447'))

    expect(body.text?.split('\n')).toEqual([
      LONG.trim(),
      'Deutscher Buchpreis 2024',
      'Prix Grand Continent',
    ])
  })

  it('does not ask Google when the DNB answered in full', async () => {
    upstreams(
      { when: 'services.dnb.de/sru', answer: record({ blurbUrl: BLURB, extent: '233 Seiten' }) },
      { when: '/blurb/', answer: blurbPage(LONG) },
      { when: 'googleapis.com', answer: google({ description: LONG }) }
    )

    await ask('isbn=9783492317948')

    expect(asked.some((url) => url.includes('googleapis.com'))).toBe(false)
  })

  it('asks Google first for an English book and takes its facts', async () => {
    upstreams({
      when: 'googleapis.com',
      answer: google({ description: LONG, pageCount: 349, publishedDate: '2021-06-03' }),
    })

    const body = await read(await ask('isbn=9780575132528&lang=en'))

    expect(body.source).toBe('Google')
    expect(body.pages).toBe(349)
    expect(body.year).toBe(2021)
    expect(asked[0]).toContain('googleapis.com')
  })

  it('keeps the DNB facts even when only Google has the text', async () => {
    upstreams(
      {
        when: 'services.dnb.de/sru',
        answer: record({ tocUrl: 'https://d-nb.info/1/04', extent: '414 Seiten', year: '2024' }),
      },
      { when: 'googleapis.com', answer: google({ description: LONG, pageCount: 999 }) }
    )

    const body = await read(await ask('isbn=9783492317948'))

    expect(body.source).toBe('Google')
    expect(body.pages).toBe(414)
    expect(body.year).toBe(2024)
    expect(asked.some((url) => url.includes('d-nb.info'))).toBe(false)
  })

  it('drops a series that only repeats the publisher', async () => {
    upstreams(
      {
        when: 'services.dnb.de/sru',
        answer: record({
          blurbUrl: BLURB,
          extent: '247 Seiten',
          series: { name: 'Suhrkamp Taschenbuch', volume: '4711' },
        }),
      },
      { when: '/blurb/', answer: blurbPage(LONG) }
    )

    const body = await read(await ask('isbn=9783518472552'))

    expect(body.series).toBeNull()
    expect(body.volume).toBeNull()
  })

  it('drops a volume number too high to be a story volume', async () => {
    upstreams(
      {
        when: 'services.dnb.de/sru',
        answer: record({
          blurbUrl: BLURB,
          extent: '391 Seiten',
          series: { name: 'Atb', volume: 'Band 91' },
        }),
      },
      { when: '/blurb/', answer: blurbPage(LONG) }
    )

    const body = await read(await ask('isbn=9783746642598'))

    expect(body.series).toBeNull()
  })

  it('passes over a text too short to be a blurb', async () => {
    upstreams(
      { when: 'services.dnb.de/sru', answer: record({ blurbUrl: BLURB, extent: '155 Seiten' }) },
      { when: '/blurb/', answer: blurbPage('Ein Roman.') },
      { when: 'googleapis.com', answer: google({ description: LONG }) }
    )

    const body = await read(await ask('isbn=9783257230451'))

    expect(body.source).toBe('Google')
    expect(body.pages).toBe(155)
  })

  it('answers with the facts alone when nobody has a blurb', async () => {
    upstreams(
      { when: 'services.dnb.de/sru', answer: record({ extent: '208 Seiten', year: '2019' }) },
      { when: 'googleapis.com', answer: NOTHING }
    )

    const response = await ask('isbn=9783446265226')
    const body = await read(response)

    expect(response.status).toBe(200)
    expect(body.text).toBeNull()
    expect(body.source).toBeNull()
    expect(body.pages).toBe(208)
  })

  it('answers 404 when no source knows the ISBN at all', async () => {
    upstreams()

    const response = await ask('isbn=9783257230451')

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toContain('max-age=3600')
  })

  it('lets the edge in front of it hold an answer for a month', async () => {
    upstreams({ when: 'googleapis.com', answer: google({ description: LONG, pageCount: 349 }) })

    const response = await ask('isbn=9780575132528&lang=en')

    expect(response.headers.get('Cache-Control')).toContain('s-maxage=2592000')
  })

  it('turns down a request without a usable ISBN before asking anybody', async () => {
    upstreams({ when: 'googleapis.com', answer: google({ description: LONG }) })

    const response = await ask('isbn=quatsch')

    expect(response.status).toBe(400)
    expect(asked).toHaveLength(0)
  })

  it('does not ask Google without a key', async () => {
    vi.stubEnv('GOOGLE_BOOKS_API_KEY', '')
    upstreams({ when: 'googleapis.com', answer: google({ description: LONG }) })

    const response = await ask('isbn=9780575132528&lang=en')

    expect(response.status).toBe(404)
    expect(asked.some((url) => url.includes('googleapis.com'))).toBe(false)
  })
})
