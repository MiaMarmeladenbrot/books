import { m } from '../paraglide/messages.js'
import { getLocale } from '../paraglide/runtime.js'

interface Formatters {
  numbers: Intl.NumberFormat
  dayShort: Intl.DateTimeFormat
  dayLong: Intl.DateTimeFormat
  monthAndYear: Intl.DateTimeFormat
  monthNarrow: Intl.DateTimeFormat
}

const byLocale = new Map<string, Formatters>()

function formatters() {
  const locale = getLocale()
  let made = byLocale.get(locale)
  if (!made) {
    made = {
      numbers: new Intl.NumberFormat(locale),
      dayShort: new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      dayLong: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
      monthAndYear: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
      monthNarrow: new Intl.DateTimeFormat(locale, { month: 'narrow' }),
    }
    byLocale.set(locale, made)
  }
  return made
}

function parseIsoDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

function monthReference(monthIndex: number) {
  return new Date(2000, monthIndex, 1)
}

export function formatNumber(value: number) {
  return formatters().numbers.format(value)
}

export function formatCompact(value: number) {
  if (value < 1000) return String(value)
  const thousands = value / 1000
  const digits = thousands < 10 ? 1 : 0
  return `${new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(thousands.toFixed(digits)))}k`
}

export function formatDay(iso: string | null) {
  return iso ? formatters().dayShort.format(parseIsoDate(iso)) : null
}

export function formatRange(from: string | null, to: string | null) {
  const { dayLong } = formatters()
  if (from && to) return dayLong.formatRange(parseIsoDate(from), parseIsoDate(to))
  if (from) return m.date_since({ date: dayLong.format(parseIsoDate(from)) })
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
  return formatters().monthAndYear.format(parseIsoDate(`${key}-01`))
}

export function monthNarrow(monthIndex: number) {
  return formatters().monthNarrow.format(monthReference(monthIndex))
}

export function todayIso() {
  return new Date().toLocaleDateString('sv-SE')
}
