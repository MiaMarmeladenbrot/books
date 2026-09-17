export const PASSWORD_MINIMUM = 8

interface Refusal {
  code?: string
  message: string
}

const REASON: Record<string, string> = {
  same_password: 'Das ist schon dein Passwort. Such dir ein anderes.',
  weak_password: 'Das Passwort ist zu leicht zu erraten.',
}

export function tooShort(password: string) {
  return password.length < PASSWORD_MINIMUM ? `Mindestens ${PASSWORD_MINIMUM} Zeichen.` : ''
}

export function refusalText(error: Refusal | null) {
  if (!error) return ''
  return REASON[error.code ?? ''] ?? error.message
}
