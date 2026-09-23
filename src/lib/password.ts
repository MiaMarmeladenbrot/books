import { m } from '../paraglide/messages.js'

export const PASSWORD_MINIMUM = 8

interface Refusal {
  code?: string
  message: string
}

const REASON: Record<string, () => string> = {
  same_password: m.error_password_same,
  weak_password: m.error_password_weak,
}

export function tooShort(password: string) {
  return password.length < PASSWORD_MINIMUM
    ? m.error_password_too_short({ count: PASSWORD_MINIMUM })
    : ''
}

export function refusalText(error: Refusal | null) {
  if (!error) return ''
  return REASON[error.code ?? '']?.() ?? error.message
}
