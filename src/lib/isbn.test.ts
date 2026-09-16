import { describe, expect, it } from 'vitest'
import { isbnFromEan13 } from './isbn'

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
