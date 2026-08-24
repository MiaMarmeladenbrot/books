import { useState, type SyntheticEvent } from 'react'
import { useAuth } from '../store/useAuth'
import { hueFromTitle } from '../utils/format'

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

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    const { error: signInError } = await signIn(email.trim(), password)
    if (signInError) setError('E-Mail oder Passwort falsch')
    setBusy(false)
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
                style={{
                  height: `${55 + (hue % 45)}%`,
                  background: `linear-gradient(150deg, hsl(${hue} 34% 40%), hsl(${(hue + 28) % 360} 30% 26%))`,
                }}
              />
            )
          })}
        </div>

        <h1 className="font-serif mb-1 text-3xl font-semibold tracking-tight">Lesestapel</h1>
        <p className="text-ink-2 mb-7 text-sm">Deine Bücher, an einem Ort.</p>

        <form onSubmit={handleSubmit}>
          <label className="mb-4 block">
            <span className="text-ink-2 mb-1.5 block text-xs font-semibold">E-Mail</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="border-line bg-card focus:border-accent w-full rounded-xl border px-3.5 py-3 text-base outline-none"
            />
          </label>
          <label className="mb-4 block">
            <span className="text-ink-2 mb-1.5 block text-xs font-semibold">Passwort</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="border-line bg-card focus:border-accent w-full rounded-xl border px-3.5 py-3 text-base outline-none"
            />
          </label>

          {error && <p className="text-danger mb-3 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="bg-accent mt-2 w-full rounded-xl py-4 text-base font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Moment…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
