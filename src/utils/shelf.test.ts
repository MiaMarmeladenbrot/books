import { describe, expect, it } from 'vitest'
import { findOnShelf } from './shelf'
import { aBook, aRecommendation } from '../test-books'

const TSCHICK = { title: 'Tschick', authors: ['Wolfgang Herrndorf'] }

describe('findOnShelf', () => {
  it('hands back the shelved copy, not just a yes', () => {
    const mine = aBook({ ...TSCHICK, isbn: '9783499256356' })
    const entry = aRecommendation({ ...TSCHICK, isbn: '9783499256356' })

    expect(findOnShelf([mine], entry)).toBe(mine)
  })

  it('reads an ISBN through whatever separators either side spells it with', () => {
    const mine = aBook({ title: 'Ein anderer Titel', authors: ['Jemand'], isbn: '978-3-499-25635-6' })
    const entry = aRecommendation({ ...TSCHICK, isbn: ' 9783499256356 ' })

    expect(findOnShelf([mine], entry)).toBe(mine)
  })

  it('finds another edition of the same book through title and author', () => {
    const mine = aBook({ ...TSCHICK, isbn: '9783871347818' })
    const entry = aRecommendation({ ...TSCHICK, isbn: '9783499256356' })

    expect(findOnShelf([mine], entry)).toBe(mine)
  })

  it('matches a title whose umlauts arrived decomposed', () => {
    const composed = 'Die Ärztin von Königsberg'.normalize('NFC')
    const decomposed = composed.normalize('NFD')
    expect(decomposed).not.toBe(composed)

    const mine = aBook({ title: composed, authors: ['Märta Öberg'] })
    const entry = aRecommendation({
      title: decomposed,
      authors: ['Märta Öberg'.normalize('NFD')],
    })

    expect(findOnShelf([mine], entry)).toBe(mine)
  })

  it('does not mind case or doubled spaces', () => {
    const mine = aBook({ title: 'Tschick', authors: ['Wolfgang Herrndorf'] })
    const entry = aRecommendation({
      title: '  TSCHICK ',
      authors: ['wolfgang   herrndorf'],
    })

    expect(findOnShelf([mine], entry)).toBe(mine)
  })

  it('keeps two books apart that share a title but not an author', () => {
    const mine = aBook({ title: 'Heimkehr', authors: ['Bernhard Schlink'] })
    const entry = aRecommendation({ title: 'Heimkehr', authors: ['Jo Nesbø'] })

    expect(findOnShelf([mine], entry)).toBeNull()
  })

  it('is not fooled into a match by an ISBN field that holds no ISBN', () => {
    const mine = aBook({ title: 'Ein Buch', authors: ['Eine Autorin'], isbn: 'unbekannt' })
    const entry = aRecommendation({ title: 'Ein anderes', authors: ['Wer anders'], isbn: 'unbekannt' })

    expect(findOnShelf([mine], entry)).toBeNull()
  })

  it('falls back to the title when only one side carries a number', () => {
    const mine = aBook({ ...TSCHICK, isbn: null })
    const entry = aRecommendation({ ...TSCHICK, isbn: '9783499256356' })

    expect(findOnShelf([mine], entry)).toBe(mine)
  })

  it('does not treat a ten digit number as the thirteen digit one of the same book', () => {
    const mine = aBook({ title: 'Ein Buch', authors: ['Eine Autorin'], isbn: '3499256355' })
    const entry = aRecommendation({ title: 'Ein anderes', authors: ['Wer anders'], isbn: '9783499256356' })

    expect(findOnShelf([mine], entry)).toBeNull()
  })

  it('finds nothing in an empty shelf and nothing among strangers', () => {
    const entry = aRecommendation(TSCHICK)

    expect(findOnShelf([], entry)).toBeNull()
    expect(findOnShelf([aBook({ title: 'Etwas ganz anderes' })], entry)).toBeNull()
  })

  it('still finds a copy whose title is written quite differently, if the number agrees', () => {
    const namesake = aBook({ title: 'Tschick', authors: ['Jemand anders'], isbn: '9780000000002' })
    const right = aBook({ ...TSCHICK, isbn: '9783499256356' })
    const entry = aRecommendation({ title: 'Ganz anders geschrieben', isbn: '9783499256356' })

    expect(findOnShelf([namesake, right], entry)).toBe(right)
  })
})
