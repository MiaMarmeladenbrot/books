const BOOKLAND_PREFIXES = ['978', '979']

function hasValidCheckDigit(digits: string) {
  let sum = 0
  for (let index = 0; index < 12; index += 1) {
    sum += Number(digits[index]) * (index % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10 === Number(digits[12])
}

export function isbnFromEan13(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 13) return null
  if (!BOOKLAND_PREFIXES.some((prefix) => digits.startsWith(prefix))) return null
  if (!hasValidCheckDigit(digits)) return null
  return digits
}
