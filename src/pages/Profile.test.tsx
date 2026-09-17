import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import type { User } from '@supabase/auth-js'
import { Profile } from './Profile'
import { AuthContext } from '../store/authContextValue'
import { BooksContext } from '../store/booksContextValue'
import { ProfileContext } from '../store/profileContextValue'
import { auth } from '../lib/supabase'
import { AvatarName } from '../types'
import type { Profile as Reader } from '../types'

vi.mock('../lib/supabase', () => ({
  auth: {
    signInWithPassword: vi.fn(),
    updateUser: vi.fn(),
  },
}))

const signInWithPassword = vi.mocked(auth.signInWithPassword)
const updateUser = vi.mocked(auth.updateUser)

const READER = { id: 'u1', email: 'mia@example.com' } as unknown as User

function aProfile(over: Partial<Reader> = {}): Reader {
  return {
    user_id: 'u1',
    display_name: 'Ann-Marie',
    avatar: AvatarName.Cat,
    created_at: '2026-09-17T08:00:00Z',
    updated_at: '2026-09-17T08:00:00Z',
    ...over,
  }
}

type AuthValue = ComponentProps<typeof AuthContext.Provider>['value']

function open(profile: Reader | null = aProfile()) {
  const signOut = vi.fn().mockResolvedValue(undefined)
  const saveProfile = vi.fn().mockImplementation(async (patch) => aProfile(patch))
  const account = { user: READER, signOut } as unknown as AuthValue
  const shelf = {
    books: [],
    loading: false,
    error: null,
    addBook: vi.fn(),
    updateBook: vi.fn(),
    removeBook: vi.fn(),
    reload: vi.fn().mockResolvedValue(undefined),
  }

  render(
    <AuthContext.Provider value={account}>
      <BooksContext.Provider value={shelf}>
        <ProfileContext.Provider value={{ profile, loading: false, error: null, saveProfile }}>
          <Profile />
        </ProfileContext.Provider>
      </BooksContext.Provider>
    </AuthContext.Provider>,
  )

  return { signOut, saveProfile }
}

function page() {
  return within(screen.getByRole('main'))
}

function edit() {
  fireEvent.click(screen.getByLabelText('Profil bearbeiten'))
}

function nameField() {
  return screen.getByLabelText('Anzeigename')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the profile as it is read', () => {
  it('falls back to a name nobody has set', () => {
    open(aProfile({ display_name: null }))

    expect(screen.getByText('Ohne Namen')).toBeInTheDocument()
  })

  it('keeps the form shut until somebody asks for it', () => {
    open()

    expect(screen.queryByLabelText('Anzeigename')).not.toBeInTheDocument()
    edit()
    expect(nameField()).toHaveValue('Ann-Marie')
  })

  it('carries the backup, which used to sit under the statistics', () => {
    open()

    expect(screen.getByText('Sicherung')).toBeInTheDocument()
    expect(page().getByRole('button', { name: 'JSON' })).toBeInTheDocument()
  })
})

describe('the profile as it is changed', () => {
  it('fills the form from the profile, not from the attempt before', () => {
    open()

    edit()
    fireEvent.change(nameField(), { target: { value: 'Anne' } })
    fireEvent.click(page().getByRole('button', { name: 'Abbrechen' }))

    edit()
    expect(nameField()).toHaveValue('Ann-Marie')
  })

  it('shows the picture that is only chosen, before anything is saved', () => {
    open()

    edit()
    expect(screen.getAllByRole('img', { name: 'Igel' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Igel' }))

    expect(screen.getAllByRole('img', { name: 'Igel' })).toHaveLength(2)
  })

  it('saves the trimmed name and the chosen picture in one go', async () => {
    const { saveProfile } = open()

    edit()
    fireEvent.change(nameField(), { target: { value: '  Anne  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Igel' }))
    fireEvent.click(screen.getByText('Sichern'))

    expect(saveProfile).toHaveBeenCalledWith({
      display_name: 'Anne',
      avatar: AvatarName.Hedgehog,
    })
  })

  it('writes an emptied name away as nothing, not as an empty string', () => {
    const { saveProfile } = open()

    edit()
    fireEvent.change(nameField(), { target: { value: '   ' } })
    fireEvent.click(screen.getByText('Sichern'))

    expect(saveProfile).toHaveBeenCalledWith({
      display_name: null,
      avatar: AvatarName.Cat,
    })
  })
})

describe('the password behind the account', () => {
  it('asks for the old one before it changes anything', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    } as Awaited<ReturnType<typeof auth.signInWithPassword>>)
    open()

    fireEvent.click(screen.getByText('Passwort ändern'))
    fireEvent.change(screen.getByLabelText('Aktuelles Passwort'), { target: { value: 'falsch' } })
    fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: 'langgenug1' } })
    fireEvent.click(screen.getByText('Ändern'))

    expect(await screen.findByText('Das aktuelle Passwort stimmt nicht.')).toBeInTheDocument()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('turns a short password down without asking anybody', () => {
    open()

    fireEvent.click(screen.getByText('Passwort ändern'))
    fireEvent.change(screen.getByLabelText('Aktuelles Passwort'), { target: { value: 'egal' } })
    fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: 'kurz' } })
    fireEvent.click(screen.getByText('Ändern'))

    expect(screen.getByText('Mindestens 8 Zeichen.')).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })
})

describe('leaving', () => {
  it('asks first and only then signs out', () => {
    const { signOut } = open()

    fireEvent.click(page().getByRole('button', { name: 'Abmelden' }))
    expect(signOut).not.toHaveBeenCalled()

    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abmelden' }))

    expect(signOut).toHaveBeenCalled()
  })
})
