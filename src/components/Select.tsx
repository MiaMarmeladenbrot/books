import { ChevronDown } from 'lucide-react'

type SelectProps = React.ComponentProps<'select'> & { wrapper?: string; chevron?: string }

export function Select({
  wrapper = '',
  chevron = 'text-ink-3',
  className = '',
  children,
  ...props
}: SelectProps) {
  return (
    <span className={`relative ${wrapper}`}>
      <select {...props} className={`appearance-none ${className}`}>
        {children}
      </select>
      <ChevronDown
        size={16}
        className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 ${chevron}`}
      />
    </span>
  )
}
