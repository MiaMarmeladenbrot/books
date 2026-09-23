import { useState, type SyntheticEvent } from 'react'
import { useAuth } from '../store/useAuth'
import { PasswordField } from '../components/PasswordField'
import { auth } from '../lib/supabase'
import { refusalText, tooShort } from '../lib/password'
import { m } from '../paraglide/messages.js'

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
        <h1 className="font-serif mb-1 text-3xl font-semibold tracking-tight">
          {m.new_password_title()}
        </h1>
        <p className="text-ink-2 mb-7 text-sm leading-relaxed">
          {m
            .new_password_intro({ email: '\u0000' })
            .split('\u0000')
            .flatMap((part, index) =>
              index === 0
                ? [part]
                : [
                    <b key="email" className="text-ink font-semibold break-all">
                      {user?.email}
                    </b>,
                    part,
                  ],
            )}
        </p>

        <form onSubmit={handleSubmit}>
          <PasswordField
            label={m.label_password()}
            value={password}
            onChange={setPassword}
            autoFocus
          />

          {error && <p className="text-danger mt-3 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="bg-accent mt-5 w-full rounded-xl py-4 text-base font-bold text-white disabled:opacity-60"
          >
            {busy ? m.action_busy() : m.action_save()}
          </button>
        </form>
      </div>
    </div>
  )
}
