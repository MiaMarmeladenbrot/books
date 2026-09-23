import { describe, expect, it } from 'vitest'
import { refusalText, tooShort } from './password'

describe('how short is too short', () => {
  it('lets eight characters through', () => {
    expect(tooShort('12345678')).toBe('')
  })

  it('turns seven down and says how many it wants', () => {
    expect(tooShort('1234567')).toBe('Mindestens 8 Zeichen')
  })

  it('counts characters, not words', () => {
    expect(tooShort('       ')).toBe('Mindestens 8 Zeichen')
    expect(tooShort('        ')).toBe('')
  })
})

describe('what a refused password is told', () => {
  it('says nothing when nothing was refused', () => {
    expect(refusalText(null)).toBe('')
  })

  it('translates the two refusals that actually happen', () => {
    expect(
      refusalText({ code: 'same_password', message: 'New password should be different' }),
    ).toBe('Das ist schon dein Passwort. Such dir ein anderes.')
    expect(refusalText({ code: 'weak_password', message: 'Password is known to be weak' })).toBe(
      'Das Passwort ist zu leicht zu erraten.',
    )
  })

  it('passes anything else through rather than swallowing it', () => {
    expect(refusalText({ code: 'over_request_rate_limit', message: 'Too many requests' })).toBe(
      'Too many requests',
    )
    expect(refusalText({ message: 'Something nobody planned for' })).toBe(
      'Something nobody planned for',
    )
  })
})
