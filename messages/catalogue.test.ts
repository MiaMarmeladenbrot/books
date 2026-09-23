import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type Variants = { declarations?: string[]; selectors?: string[]; match: Record<string, string> }
type Message = string | [Variants]
type Catalogue = Record<string, Message>

function load(file: string) {
  return JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'))
}

const { baseLocale, locales } = load('../project.inlang/settings.json') as {
  baseLocale: string
  locales: string[]
}

const translations = new Map<string, Catalogue>(
  locales.map((locale) => {
    const catalogue = load(`./${locale}.json`) as Catalogue
    delete catalogue.$schema
    return [locale, catalogue]
  }),
)

const base = translations.get(baseLocale)!
const others = locales.filter((locale) => locale !== baseLocale)

function patterns(message: Message) {
  return typeof message === 'string' ? [message] : Object.values(message[0].match)
}

function placeholders(message: Message) {
  const names = patterns(message).flatMap((pattern) =>
    [...pattern.matchAll(/\{(\w+)\}/g)].map(([, name]) => name),
  )
  return [...new Set(names)].sort().join(',')
}

function variants(message: Message) {
  return typeof message === 'string' ? '' : Object.keys(message[0].match).sort().join(',')
}

describe.each(others)('%s against the base locale', (locale) => {
  const translated = translations.get(locale)!

  it('translates every message, and invents none', () => {
    const untranslated = Object.keys(base).filter((key) => !(key in translated))
    const unknown = Object.keys(translated).filter((key) => !(key in base))
    expect({ untranslated, unknown }).toEqual({ untranslated: [], unknown: [] })
  })

  it('keeps every placeholder the base locale hands it', () => {
    const drifted = Object.keys(base)
      .filter((key) => key in translated)
      .filter((key) => placeholders(base[key]) !== placeholders(translated[key]))
    expect(drifted).toEqual([])
  })

  it('stays plural wherever the base locale is plural', () => {
    const drifted = Object.keys(base)
      .filter((key) => key in translated)
      .filter((key) => variants(base[key]) !== variants(translated[key]))
    expect(drifted).toEqual([])
  })

  it('leaves nothing blank', () => {
    const blank = Object.keys(translated).filter((key) =>
      patterns(translated[key]).some((pattern) => pattern.trim() === ''),
    )
    expect(blank).toEqual([])
  })
})
