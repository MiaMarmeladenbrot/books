const LOCALE = 'de-DE'

const numbers = new Intl.NumberFormat(LOCALE)
const dayShort = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
const dayLong = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
const monthAndYear = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })
const monthShortFormat = new Intl.DateTimeFormat(LOCALE, { month: 'short' })
const monthNarrowFormat = new Intl.DateTimeFormat(LOCALE, { month: 'narrow' })

function parseIsoDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

function monthReference(monthIndex: number) {
  return new Date(2000, monthIndex, 1)
}

export function formatNumber(value: number) {
  return numbers.format(value)
}

export function formatCompact(value: number) {
  if (value < 1000) return String(value)
  const thousands = value / 1000
  return `${thousands.toFixed(thousands < 10 ? 1 : 0).replace('.', ',')}k`
}

export function formatDay(iso: string | null) {
  return iso ? dayShort.format(parseIsoDate(iso)) : null
}

export function formatRange(from: string | null, to: string | null) {
  if (from && to) return dayLong.formatRange(parseIsoDate(from), parseIsoDate(to))
  if (from) return `seit ${dayLong.format(parseIsoDate(from))}`
  if (to) return dayLong.format(parseIsoDate(to))
  return null
}

export function readingDays(from: string | null, to: string | null) {
  if (!from || !to) return null
  const span = parseIsoDate(to).getTime() - parseIsoDate(from).getTime()
  return Number.isNaN(span) ? null : Math.round(span / 86_400_000)
}

export function monthKey(iso: string) {
  return iso.slice(0, 7)
}

export function monthLabel(key: string) {
  return monthAndYear.format(parseIsoDate(`${key}-01`))
}

export function monthShort(monthIndex: number) {
  return monthShortFormat.format(monthReference(monthIndex))
}

export function monthNarrow(monthIndex: number) {
  return monthNarrowFormat.format(monthReference(monthIndex))
}

export function todayIso() {
  return new Date().toLocaleDateString('sv-SE')
}

export function hueFromTitle(title: string) {
  let hue = 0
  for (const character of title) hue = (hue * 31 + character.charCodeAt(0)) % 360
  return hue
}
