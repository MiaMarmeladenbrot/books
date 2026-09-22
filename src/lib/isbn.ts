const BOOKLAND_PREFIXES = ['978', '979']

function checkDigit(body: string) {
  let sum = 0
  for (let index = 0; index < 12; index += 1) {
    sum += Number(body[index]) * (index % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10
}

function hasValidCheckDigit(digits: string) {
  return checkDigit(digits) === Number(digits[12])
}

function tenIsSound(digits: string) {
  let sum = 0
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index)
  }
  return (sum + (digits[9] === 'X' ? 10 : Number(digits[9]))) % 11 === 0
}

export function isbnThirteen(raw: string) {
  const digits = raw.replace(/[^0-9Xx]/g, '').toUpperCase()
  if (/^\d{13}$/.test(digits)) return isbnFromEan13(digits)
  if (!/^\d{9}[\dX]$/.test(digits) || !tenIsSound(digits)) return null
  const body = `978${digits.slice(0, 9)}`
  return `${body}${checkDigit(body)}`
}

export function isbnFromEan13(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 13) return null
  if (!BOOKLAND_PREFIXES.some((prefix) => digits.startsWith(prefix))) return null
  if (!hasValidCheckDigit(digits)) return null
  return digits
}
