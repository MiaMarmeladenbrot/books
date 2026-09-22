import { useEffect, useState } from 'react'

export interface Catalogue {
  text: string | null
  source: string | null
  pages: number | null
  year: number | null
  series: string | null
  volume: number | null
}

interface Asked {
  isbn: string
  entry: Catalogue | null
}

export function useCatalogue(isbn: string | null, language: string | null) {
  const [answer, setAnswer] = useState<Asked | null>(null)

  useEffect(() => {
    if (!isbn) return

    let current = true
    const asked = new URLSearchParams({ isbn })
    if (language) asked.set('lang', language)

    const load = async () => {
      let entry: Catalogue | null = null
      try {
        const response = await fetch(`/api/catalogue?${asked}`, {
          cache: import.meta.env.DEV ? 'no-store' : 'default',
        })
        if (response.ok) entry = (await response.json()) as Catalogue
      } catch {
        entry = null
      }
      if (current) setAnswer({ isbn, entry })
    }
    void load()

    return () => {
      current = false
    }
  }, [isbn, language])

  const settled = answer?.isbn === isbn
  return {
    entry: settled ? answer.entry : null,
    asking: Boolean(isbn) && !settled,
  }
}

