import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const fieldClass =
  'border-line bg-card focus:border-accent w-full rounded-xl border py-3 pr-12 pl-3.5 text-base outline-none'
const labelClass = 'text-ink-2 mb-1.5 block text-xs font-semibold'

interface PasswordFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}

export function PasswordField({ label, value, onChange, autoFocus }: PasswordFieldProps) {
  const [shown, setShown] = useState(false)
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          autoFocus={autoFocus}
          className={fieldClass}
        />
        <button
          type="button"
          onClick={() => setShown(!shown)}
          aria-label={shown ? 'Passwort verbergen' : 'Passwort zeigen'}
          aria-pressed={shown}
          className="text-ink-3 absolute inset-y-0 right-0 flex w-12 items-center justify-center"
        >
          {shown ? <EyeOff size={19} strokeWidth={1.8} /> : <Eye size={19} strokeWidth={1.8} />}
        </button>
      </div>
    </div>
  )
}
