import { describe, expect, it } from 'vitest'
import { looksLikeIsbn, pickIsbn } from './lookup'

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
