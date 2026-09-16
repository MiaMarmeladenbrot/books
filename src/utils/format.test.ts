import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCompact, formatNumber, monthKey, readingDays, todayIso } from './format'

describe('the zone these tests are built on', () => {
  it('is Europe/Berlin, or the switching days prove nothing', () => {
    expect(new Date('2026-03-28T00:00:00').getTimezoneOffset()).toBe(-60)
    expect(new Date('2026-07-01T00:00:00').getTimezoneOffset()).toBe(-120)
  })
})

describe('readingDays', () => {
  it('stays empty while a date is missing', () => {
    expect(readingDays(null, '2026-09-14')).toBeNull()
    expect(readingDays('2026-09-13', null)).toBeNull()
    expect(readingDays(null, null)).toBeNull()
  })

  it('counts the same day as no days', () => {
    expect(readingDays('2026-09-13', '2026-09-13')).toBe(0)
  })

  it('counts consecutive days as one', () => {
    expect(readingDays('2026-09-13', '2026-09-14')).toBe(1)
  })

  it('counts across the spring switch', () => {
    expect(readingDays('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('counts across the autumn switch', () => {
    expect(readingDays('2026-10-24', '2026-10-26')).toBe(2)
  })

  it('hands back an unreadable date as empty', () => {
    expect(readingDays('sometime', '2026-09-14')).toBeNull()
  })

  it('does not guard against a reversed order, the table does', () => {
    expect(readingDays('2026-09-14', '2026-09-13')).toBe(-1)
  })
})

describe('monthKey', () => {
  it('cuts year and month out without doing arithmetic', () => {
    expect(monthKey('2026-09-13')).toBe('2026-09')
    expect(monthKey('2026-01-01')).toBe('2026-01')
    expect(monthKey('2026-12-31')).toBe('2026-12')
  })
})

describe('formatCompact', () => {
  it('leaves small numbers alone', () => {
    expect(formatCompact(0)).toBe('0')
    expect(formatCompact(627)).toBe('627')
    expect(formatCompact(999)).toBe('999')
  })

  it('shortens from a thousand upwards, with a comma', () => {
    expect(formatCompact(1000)).toBe('1,0k')
    expect(formatCompact(1540)).toBe('1,5k')
  })

  it('drops the decimal only at ten thousand', () => {
    expect(formatCompact(9999)).toBe('10,0k')
    expect(formatCompact(10_000)).toBe('10k')
    expect(formatCompact(627_000)).toBe('627k')
  })

  it('rounds 9.95 down, because toFixed finds the number that way', () => {
    expect(formatCompact(9950)).toBe('9,9k')
  })
})

describe('formatNumber', () => {
  it('groups in German, with a full stop', () => {
    expect(formatNumber(1234)).toBe('1.234')
    expect(formatNumber(627)).toBe('627')
  })
})

describe('todayIso', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('names the day that holds here', () => {
    vi.setSystemTime(new Date('2026-09-16T10:00:00Z'))
    expect(todayIso()).toBe('2026-09-16')
  })

  it('takes the local day, not the one in Greenwich', () => {
    vi.setSystemTime(new Date('2026-09-16T23:30:00Z'))
    expect(todayIso()).toBe('2026-09-17')

    vi.setSystemTime(new Date('2026-01-01T23:30:00Z'))
    expect(todayIso()).toBe('2026-01-02')
  })
})
