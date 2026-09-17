import { useState, type SyntheticEvent } from 'react'
import { useAuth } from '../store/useAuth'
import { PasswordField } from '../components/PasswordField'
import { auth } from '../lib/supabase'
import { refusalText, tooShort } from '../lib/password'

export function NewPassword() {
  const { user, endRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault()
    setError('')
    const short = tooShort(password)
    if (short) {
      setError(short)
      return
    }
    setBusy(true)
    const { error: refused } = await auth.updateUser({ password })
    if (refused) {
      setError(refusalText(refused))
      setBusy(false)
      return
    }
    endRecovery()
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-7 pt-10 pb-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-serif mb-1 text-3xl font-semibold tracking-tight">Neues Passwort</h1>
        <p className="text-ink-2 mb-7 text-sm leading-relaxed">
          Du bist angemeldet als <b className="text-ink font-semibold break-all">{user?.email}</b>.
          Such dir eins aus, dann geht es weiter ins Regal.
        </p>

        <form onSubmit={handleSubmit}>
          <PasswordField label="Passwort" value={password} onChange={setPassword} autoFocus />

          {error && <p className="text-danger mt-3 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="bg-accent mt-5 w-full rounded-xl py-4 text-base font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Moment…' : 'Sichern'}
          </button>
        </form>
      </div>
    </div>
  )
}
