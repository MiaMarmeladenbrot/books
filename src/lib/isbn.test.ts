import { describe, expect, it } from 'vitest'
import { isbnFromEan13, isbnThirteen } from './isbn'

describe('isbnFromEan13', () => {
  it('takes a sound 978 number', () => {
    expect(isbnFromEan13('9783161484100')).toBe('9783161484100')
  })

  it('takes a sound 979 number', () => {
    expect(isbnFromEan13('9791234567896')).toBe('9791234567896')
  })

  it('clears separators away before it counts', () => {
    expect(isbnFromEan13('978-3-16-148410-0')).toBe('9783161484100')
    expect(isbnFromEan13(' 978 3 16 148410 0 ')).toBe('9783161484100')
  })

  it('turns down a wrong check digit', () => {
    expect(isbnFromEan13('9783161484101')).toBeNull()
  })

  it('notices a transposed pair in the middle', () => {
    expect(isbnFromEan13('9783161844100')).toBeNull()
  })

  it('turns down anything that is not thirteen digits', () => {
    expect(isbnFromEan13('978316148410')).toBeNull()
    expect(isbnFromEan13('97831614841000')).toBeNull()
    expect(isbnFromEan13('')).toBeNull()
  })

  it('is not talked into a short number by a letter', () => {
    expect(isbnFromEan13('978316148410X')).toBeNull()
  })

  it('turns down a sound number that is not a book', () => {
    expect(isbnFromEan13('4006381333931')).toBeNull()
  })
})

describe('isbnThirteen', () => {
  it('hands a sound thirteen digit number straight back', () => {
    expect(isbnThirteen('9783161484100')).toBe('9783161484100')
  })

  it('clears separators away first', () => {
    expect(isbnThirteen('978-3-16-148410-0')).toBe('9783161484100')
    expect(isbnThirteen(' 3-257-07084-5 ')).toBe('9783257070842')
  })

  it('carries a ten digit number over to its thirteen digit form', () => {
    expect(isbnThirteen('3257070845')).toBe('9783257070842')
    expect(isbnThirteen('3446269142')).toBe('9783446269149')
  })

  it('reads the X that stands for ten', () => {
    expect(isbnThirteen('354806647X')).toBe('9783548066479')
    expect(isbnThirteen('396161007x')).toBe('9783961610075')
  })

  it('counts the ten digit check digit before it converts', () => {
    for (const last of '0123456789') {
      expect(isbnThirteen(`316148410${last}`)).toBeNull()
    }
    expect(isbnThirteen('316148410X')).toBe('9783161484100')
  })

  it('holds a thirteen digit number to the same rule as the scanner', () => {
    expect(isbnThirteen('9783161484101')).toBeNull()
    expect(isbnThirteen('4006381333931')).toBeNull()
  })

  it('has no address for what is not a number at all', () => {
    expect(isbnThirteen('unbekannt')).toBeNull()
    expect(isbnThirteen('')).toBeNull()
    expect(isbnThirteen('12345')).toBeNull()
  })
})
