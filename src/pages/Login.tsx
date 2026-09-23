import { useState, type SyntheticEvent } from 'react'
import { useAuth } from '../store/useAuth'
import { hueFromTitle, spineGradient } from '../utils/spine'
import { m } from '../paraglide/messages.js'

const SPINE_SEEDS = [
  'Die Wut, die bleibt',
  'Das Sommerbuch',
  'Antichristie',
  'Saltblood',
  'Noto',
  'Gym',
  'Pause',
  'Yesteryear',
  'Illuminae',
  'Fabula Rasa',
  'The Bone Clocks',
  'Marchfield Square',
  'Bis zum Mond',
  'Sad Cypress',
  'Atmosphere',
  'The Wedding People',
  'Nostalgia Siciliana',
  'Keeping It Casual',
  'The Alice Network',
  'Die Känguru-Rebellion',
  'The Dinner',
  '25 letzte Sommer',
]

const fieldClass =
  'border-line bg-card focus:border-accent w-full rounded-xl border px-3.5 py-3 text-base outline-none'
const labelClass = 'text-ink-2 mb-1.5 block text-xs font-semibold'

export function Login() {
  const { signIn, requestReset } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    const { error: signInError } = await signIn(email.trim(), password)
    if (signInError) setError(m.error_sign_in())
    setBusy(false)
  }

  const handleReset = async (event: SyntheticEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    const { error: refused } = await requestReset(email.trim())
    if (refused) setError(m.error_reset_failed())
    else setSent(true)
    setBusy(false)
  }

  const ask = () => {
    setError('')
    setPassword('')
    setAsking(true)
  }

  const back = () => {
    setError('')
    setSent(false)
    setAsking(false)
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-7 pt-10 pb-16">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-7 flex h-22 items-end gap-0.75">
          {SPINE_SEEDS.map((seed) => {
            const hue = hueFromTitle(seed)
            return (
              <span
                key={seed}
                className="flex-1 rounded-t-xs"
                style={{ height: `${55 + (hue % 45)}%`, background: spineGradient(hue) }}
              />
            )
          })}
        </div>

        <h1 className="font-serif mb-1 text-3xl font-semibold tracking-tight">Lesestapel</h1>
        <p className="text-ink-2 mb-7 text-sm">
          {asking ? m.login_reset_tagline() : m.login_tagline()}
        </p>

        {sent ? (
          <>
            <p className="text-ink-2 text-sm leading-relaxed">
              {m
                .login_reset_sent({ email: '\u0000' })
                .split('\u0000')
                .flatMap((part, index) =>
                  index === 0
                    ? [part]
                    : [
                        <b key="email" className="text-ink font-semibold">
                          {email.trim()}
                        </b>,
                        part,
                      ],
                )}
            </p>
            <button type="button" onClick={back} className="text-accent mt-6 text-sm font-semibold">
              {m.login_back()}
            </button>
          </>
        ) : (
          <form onSubmit={asking ? handleReset : handleSubmit}>
            <label className="mb-4 block">
              <span className={labelClass}>{m.label_email()}</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className={fieldClass}
              />
            </label>

            {!asking && (
              <label className="mb-4 block">
                <span className={labelClass}>{m.label_password()}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className={fieldClass}
                />
              </label>
            )}

            {error && <p className="text-danger mb-3 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="bg-accent mt-2 w-full rounded-xl py-4 text-base font-bold text-white disabled:opacity-60"
            >
              {busy ? m.action_busy() : asking ? m.login_send_link() : m.login_submit()}
            </button>

            <button
              type="button"
              onClick={asking ? back : ask}
              className="text-ink-3 mt-5 w-full text-center text-sm font-semibold"
            >
              {asking ? m.login_back() : m.login_forgot()}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
