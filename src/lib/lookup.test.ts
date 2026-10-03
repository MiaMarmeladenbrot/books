import { describe, expect, it } from 'vitest'
import { BookFormat } from '../types'
import { looksLikeIsbn, pickIsbn, rankCandidates, type Candidate } from './lookup'

function book(title: string, authors: string[], details: Partial<Candidate> = {}): Candidate {
  return {
    title,
    subtitle: null,
    authors,
    series: null,
    series_volume: null,
    isbn: null,
    published_year: null,
    page_count: null,
    publisher: null,
    language: null,
    format: null,
    cover_url: null,
    source: 'OpenLibrary',
    ...details,
  }
}

describe('rankCandidates', () => {
  const avalon = book('Grand Hotel Avalon', ['Maggie Stiefvater'], {
    isbn: '9783401606897',
    page_count: 480,
    format: BookFormat.Paperback,
    source: 'DNB',
  })
  const listeners = book('Listeners', ['Maggie Stiefvater'], {
    isbn: '9781338188332',
    page_count: 416,
  })
  const spanish = book('Voz del agua / The Listeners', ['Maggie Stiefvater'], {
    isbn: '9788419266262',
  })
  const titles = (input: string) =>
    rankCandidates([avalon, spanish, listeners], input).map((candidate) => candidate.title)

  it('puts the book first whatever the article and the author do to the query', () => {
    expect(titles('The Listeners Stiefvater')[0]).toBe('Listeners')
    expect(titles('The Listeners')[0]).toBe('Listeners')
    expect(titles('Listeners Stiefvater')[0]).toBe('Listeners')
  })

  it('still ranks a book that only shares the author below one that shares the title', () => {
    expect(titles('The Listeners Stiefvater').indexOf('Grand Hotel Avalon')).toBe(2)
  })

  it('does not let the author word push out the title it belongs to', () => {
    const magicMountain = book('Der Zauberberg', ['Thomas Mann'], { source: 'DNB' })
    const musil = book('Der Mann ohne Eigenschaften', ['Robert Musil'], { source: 'DNB' })
    const ranked = rankCandidates([musil, magicMountain], 'Der Zauberberg Mann')

    expect(ranked[0].title).toBe('Der Zauberberg')
  })

  it('gives no title points for a query that is only the author', () => {
    const ranked = rankCandidates([listeners, avalon], 'Stiefvater')

    expect(ranked[0].title).toBe('Grand Hotel Avalon')
  })
})

describe('pickIsbn', () => {
  it('stays empty when no thirteen-digit number is there', () => {
    expect(pickIsbn([], 'de')).toBeNull()
    expect(pickIsbn(['3161484100'], 'de')).toBeNull()
  })

  it('takes the German group when the book is German', () => {
    expect(pickIsbn(['9780306406157', '9783161484100'], 'de')).toBe('9783161484100')
  })

  it('takes an English group when the book is English', () => {
    expect(pickIsbn(['9783161484100', '9780306406157'], 'en')).toBe('9780306406157')
    expect(pickIsbn(['9783161484100', '9781234567897'], 'en')).toBe('9781234567897')
  })

  it('takes an Italian group when the book is Italian', () => {
    expect(pickIsbn(['9783161484100', '9788804817185'], 'it')).toBe('9788804817185')
    expect(pickIsbn(['9780306406157', '9791259856265'], 'it')).toBe('9791259856265')
  })

  it('prefers 9780 over 9781, because the groups stand in that order', () => {
    expect(pickIsbn(['9781234567897', '9780306406157'], 'en')).toBe('9780306406157')
  })

  it('takes the first thirteen-digit number when no group fits', () => {
    expect(pickIsbn(['9791234567896', '9783161484100'], 'en')).toBe('9791234567896')
  })

  it('takes the first thirteen-digit number when the language is unknown', () => {
    expect(pickIsbn(['9780306406157', '9783161484100'], null)).toBe('9780306406157')
    expect(pickIsbn(['9780306406157', '9783161484100'], 'sv')).toBe('9780306406157')
  })

  it('passes over the ten-digit ones beside the fitting group', () => {
    expect(pickIsbn(['3161484100', '9783161484100'], 'de')).toBe('9783161484100')
  })
})

describe('looksLikeIsbn', () => {
  it('recognises ten and thirteen digits, separators and all', () => {
    expect(looksLikeIsbn('3161484100')).toBe(true)
    expect(looksLikeIsbn('978-3-16-148410-0')).toBe(true)
    expect(looksLikeIsbn('3-16-148410-X')).toBe(true)
  })

  it('does not take a title for a number', () => {
    expect(looksLikeIsbn('Across the Universe')).toBe(false)
    expect(looksLikeIsbn('2011')).toBe(false)
    expect(looksLikeIsbn('')).toBe(false)
  })
})
