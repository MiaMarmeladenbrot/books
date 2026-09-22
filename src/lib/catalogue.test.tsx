import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useCatalogue, type Catalogue } from './catalogue'

const FULL: Catalogue = {
  text: 'Ein Sommertag, der das ganze Leben erzählt.',
  source: 'DNB',
  pages: 233,
  year: 2023,
  series: 'Winge und Cardell ermitteln',
  volume: 2,
}

function answers(body: object | null, status = 200) {
  const fetch = vi.fn().mockResolvedValue(
    body === null
      ? new Response('nichts gefunden', { status })
      : new Response(JSON.stringify(body), { status })
  )
  vi.stubGlobal('fetch', fetch)
  return fetch
}

function Probe({ isbn, language }: { isbn: string | null; language: string | null }) {
  const { entry, asking } = useCatalogue(isbn, language)
  if (asking) return <output>fragt</output>
  return <output>{entry ? `${entry.text} | ${entry.pages} Seiten | Band ${entry.volume}` : 'still'}</output>
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCatalogue', () => {
  it('asks the function and hands the whole entry back', async () => {
    const fetch = answers(FULL)

    render(<Probe isbn="9783492317948" language="de" />)

    await screen.findByText(/Sommertag/)
    expect(String(fetch.mock.calls[0][0])).toBe('/api/catalogue?isbn=9783492317948&lang=de')
  })

  it('does not ask without an ISBN', () => {
    const fetch = answers(FULL)

    render(<Probe isbn={null} language="de" />)

    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByText('still')).toBeInTheDocument()
  })

  it('stays quiet when the catalogue knows nothing', async () => {
    answers(null, 404)

    render(<Probe isbn="9783492317948" language="de" />)

    await waitFor(() => expect(screen.getByText('still')).toBeInTheDocument())
  })

  it('stays quiet when the function is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('weg')))

    render(<Probe isbn="9783492317948" language="de" />)

    await waitFor(() => expect(screen.getByText('still')).toBeInTheDocument())
  })

  it('says it is still asking until the answer is there, so the page can hold the space', async () => {
    answers(FULL)

    render(<Probe isbn="9783492317948" language="de" />)

    expect(screen.getByText('fragt')).toBeInTheDocument()
    await screen.findByText(/Sommertag/)
  })
})

