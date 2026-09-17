import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import type { User } from '@supabase/auth-js'
import { NewPassword } from './NewPassword'
import { AuthContext } from '../store/authContextValue'
import { auth } from '../lib/supabase'

vi.mock('../lib/supabase', () => ({ auth: { updateUser: vi.fn() } }))

const updateUser = vi.mocked(auth.updateUser)
const READER = { id: 'u1', email: 'mia@example.com' } as unknown as User
type AuthValue = ComponentProps<typeof AuthContext.Provider>['value']

function landed() {
  const endRecovery = vi.fn()
  const account = { user: READER, endRecovery } as unknown as AuthValue

  render(
    <AuthContext.Provider value={account}>
      <NewPassword />
    </AuthContext.Provider>,
  )

  return { endRecovery }
}

function type(password: string) {
  fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: password } })
}

function save() {
  fireEvent.click(screen.getByRole('button', { name: 'Sichern' }))
}

function refuse(code: string, message: string) {
  updateUser.mockResolvedValue({ data: { user: null }, error: { code, message } } as Awaited<
    ReturnType<typeof auth.updateUser>
  >)
}

beforeEach(() => {
  vi.clearAllMocks()
  updateUser.mockResolvedValue({ data: { user: READER }, error: null } as Awaited<
    ReturnType<typeof auth.updateUser>
  >)
})

describe('the page somebody lands on after the link', () => {
  it('names the account the link belongs to', () => {
    landed()

    expect(screen.getByText('mia@example.com')).toBeInTheDocument()
  })

  it('turns a short password down without asking anybody', () => {
    landed()

    type('kurz')
    save()

    expect(screen.getByText('Mindestens 8 Zeichen.')).toBeInTheDocument()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('repeats the reason a password was refused', async () => {
    refuse('same_password', 'New password should be different from the old password.')
    landed()

    type('dasselbewieimmer')
    save()

    expect(
      await screen.findByText('Das ist schon dein Passwort. Such dir ein anderes.'),
    ).toBeInTheDocument()
  })

  it('stays on the page when the password was refused', async () => {
    refuse('weak_password', 'Password is known to be weak.')
    const { endRecovery } = landed()

    type('passwort123')
    save()

    await screen.findByText('Das Passwort ist zu leicht zu erraten.')
    expect(endRecovery).not.toHaveBeenCalled()
  })

  it('lets go of the recovery once the password is set', async () => {
    const { endRecovery } = landed()

    type('einneuesgutes')
    save()

    await vi.waitFor(() => expect(endRecovery).toHaveBeenCalled())
    expect(updateUser).toHaveBeenCalledWith({ password: 'einneuesgutes' })
  })
})
