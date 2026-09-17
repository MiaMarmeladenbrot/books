import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { Login } from './Login'
import { AuthContext } from '../store/authContextValue'

type AuthValue = ComponentProps<typeof AuthContext.Provider>['value']

function loginPage() {
  const signIn = vi.fn().mockResolvedValue({ error: null })
  const requestReset = vi.fn().mockResolvedValue({ error: null })
  const account = { signIn, requestReset } as unknown as AuthValue

  render(
    <AuthContext.Provider value={account}>
      <Login />
    </AuthContext.Provider>,
  )

  return { signIn, requestReset }
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function press(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signing in', () => {
  it('hands over what was typed, without the stray spaces', async () => {
    const { signIn } = loginPage()

    fill('E-Mail', '  mia@example.com ')
    fill('Passwort', 'geheim')
    press('Anmelden')

    await vi.waitFor(() => expect(signIn).toHaveBeenCalledWith('mia@example.com', 'geheim'))
  })

  it('says which half was wrong without saying which', async () => {
    const { signIn } = loginPage()
    signIn.mockResolvedValue({ error: new Error('Invalid login credentials') })

    fill('E-Mail', 'mia@example.com')
    fill('Passwort', 'falsch')
    press('Anmelden')

    expect(await screen.findByText('E-Mail oder Passwort falsch')).toBeInTheDocument()
  })
})

describe('forgetting the password', () => {
  it('asks for the address alone', () => {
    loginPage()

    press('Passwort vergessen?')

    expect(screen.queryByLabelText('Passwort')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Link schicken' })).toBeInTheDocument()
  })

  it('sends the link and keeps quiet about whether the account exists', async () => {
    const { requestReset } = loginPage()

    press('Passwort vergessen?')
    fill('E-Mail', 'wer@example.com')
    press('Link schicken')

    expect(await screen.findByText(/Wenn es ein Konto/)).toBeInTheDocument()
    expect(requestReset).toHaveBeenCalledWith('wer@example.com')
  })

  it('does not sign anybody in along the way', async () => {
    const { signIn, requestReset } = loginPage()

    press('Passwort vergessen?')
    fill('E-Mail', 'wer@example.com')
    press('Link schicken')

    await vi.waitFor(() => expect(requestReset).toHaveBeenCalled())
    expect(signIn).not.toHaveBeenCalled()
  })

  it('finds its way back to signing in', async () => {
    const { requestReset } = loginPage()

    press('Passwort vergessen?')
    fill('E-Mail', 'wer@example.com')
    press('Link schicken')

    await screen.findByText(/Wenn es ein Konto/)
    press('Zurück zur Anmeldung')

    expect(screen.getByLabelText('Passwort')).toBeInTheDocument()
    expect(requestReset).toHaveBeenCalledTimes(1)
  })
})
