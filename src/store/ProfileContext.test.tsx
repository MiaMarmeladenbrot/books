import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import type { User } from '@supabase/auth-js'
import { ProfileProvider } from './ProfileContext'
import { AuthContext } from './authContextValue'
import { useProfile } from './useProfile'
import { AvatarName } from '../types'

const tables = vi.hoisted(() => ({ profiles: [] as Record<string, unknown>[] }))

vi.mock('../lib/supabase', async () => {
  const { fakeDb } = await import('../test-postgrest')
  return { db: fakeDb(tables) }
})

const MIA = '0324d52a-ecc4-43cf-bf86-fd9000000000'

function everybody() {
  return [
    { user_id: MIA, display_name: 'Mia', avatar: AvatarName.Owl },
    { user_id: 'u2', display_name: 'Sinja', avatar: AvatarName.Cat },
    { user_id: 'u3', display_name: null, avatar: AvatarName.Moon },
    { user_id: 'u4', display_name: null, avatar: AvatarName.Mug },
  ]
}

function Shown() {
  const { profile, loading, error, saveProfile } = useProfile()

  if (loading) return <p>lädt</p>
  if (error) return <p>Fehler: {error}</p>

  return (
    <>
      <p>{profile?.display_name ?? 'Ohne Namen'}</p>
      <p>Bild: {profile?.avatar ?? 'keins'}</p>
      <button type="button" onClick={() => void saveProfile({ display_name: 'Mia M.' })}>
        Umbenennen
      </button>
    </>
  )
}

function open(userId: string | null = MIA) {
  const account = {
    user: userId ? ({ id: userId } as unknown as User) : null,
    loading: false,
    recovering: false,
  } as unknown as ComponentProps<typeof AuthContext.Provider>['value']

  render(
    <AuthContext.Provider value={account}>
      <ProfileProvider>
        <Shown />
      </ProfileProvider>
    </AuthContext.Provider>,
  )
}

describe('ProfileProvider', () => {
  beforeEach(() => {
    tables.profiles = everybody()
  })

  it('finds its own row in a table that holds everybody', async () => {
    open()

    expect(await screen.findByText('Mia')).toBeInTheDocument()
    expect(screen.getByText('Bild: owl')).toBeInTheDocument()
  })

  it('does not go looking for somebody else', async () => {
    open('u2')

    expect(await screen.findByText('Sinja')).toBeInTheDocument()
  })

  it('takes an account without a row yet for what it is, not for an error', async () => {
    tables.profiles = []
    open()

    expect(await screen.findByText('Ohne Namen')).toBeInTheDocument()
    expect(screen.queryByText(/^Fehler:/)).not.toBeInTheDocument()
  })

  it('writes a new name into one row and leaves the other three alone', async () => {
    open()
    await screen.findByText('Mia')

    fireEvent.click(screen.getByRole('button', { name: 'Umbenennen' }))

    expect(await screen.findByText('Mia M.')).toBeInTheDocument()
    expect(tables.profiles.map((row) => row.display_name)).toEqual([
      'Mia M.',
      'Sinja',
      null,
      null,
    ])
  })

  it('asks for nothing at all while nobody is signed in', async () => {
    open(null)

    expect(await screen.findByText('lädt')).toBeInTheDocument()
  })
})
