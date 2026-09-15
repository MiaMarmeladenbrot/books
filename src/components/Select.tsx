import { ChevronDown, X } from 'lucide-react'

type SelectProps = React.ComponentProps<'select'> & {
  wrapper?: string
  chevron?: string
  onClear?: () => void
  clearLabel?: string
}

export function Select({
  wrapper = '',
  chevron = 'text-ink-3',
  className = '',
  onClear,
  clearLabel,
  children,
  ...props
}: SelectProps) {
  return (
    <span className={`relative ${wrapper}`}>
      <select {...props} className={`appearance-none ${className}`}>
        {children}
      </select>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className={`absolute top-1/2 right-1.5 -translate-y-1/2 p-1.5 ${chevron}`}
        >
          <X size={15} />
        </button>
      ) : (
        <ChevronDown
          size={16}
          className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 ${chevron}`}
        />
      )}
    </span>
  )
}
