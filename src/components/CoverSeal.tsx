import { Gem } from 'lucide-react'

const SIZE = {
  sm: { disc: 'size-8 -right-2 -bottom-2', gem: 17 },
  md: { disc: 'size-10 -right-2.5 -bottom-2.5', gem: 20 },
}

interface CoverSealProps {
  recommended: boolean
  label: string
  size?: keyof typeof SIZE
  onClick?: () => void
}

export function CoverSeal({ recommended, label, size = 'sm', onClick }: CoverSealProps) {
  const { disc, gem } = SIZE[size]
  const className = `bg-paper absolute flex items-center justify-center rounded-full border shadow-[0_4px_10px_-4px_rgb(30_26_21/0.5)] ${disc} ${recommended ? 'border-line' : 'border-gold/60 border-dashed'}`
  const icon = (
    <Gem size={gem} strokeWidth={2} className={recommended ? 'text-gold' : 'text-gold/60'} />
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label} className={className}>
        {icon}
      </button>
    )
  }

  return (
    <span role="img" aria-label={label} className={className}>
      {icon}
    </span>
  )
}
