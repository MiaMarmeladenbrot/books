import { useState } from 'react'
import { hueFromTitle } from '../utils/format'

export const COVER_SHAPE =
  'relative aspect-[5/8] overflow-hidden rounded-sm shadow-[0_1px_2px_rgb(30_26_21/0.18),0_10px_20px_-10px_rgb(30_26_21/0.45)]'

interface CoverProps {
  title: string
  authors: string[]
  src?: string | null
  showText?: boolean
  className?: string
}

export function Cover({ title, authors, src, showText = true, className = '' }: CoverProps) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null)

  if (src && src !== brokenSrc) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setBrokenSrc(src)}
        className={`${COVER_SHAPE} bg-shade w-full object-cover ${className}`}
      />
    )
  }

  const hue = hueFromTitle(title)
  const background = `linear-gradient(150deg, hsl(${hue} 34% 40%), hsl(${(hue + 28) % 360} 30% 26%))`

  return (
    <div
      className={`${COVER_SHAPE} flex flex-col justify-end text-white ${showText ? 'py-3 pr-3 pl-4' : ''} ${className}`}
      style={{ background }}
    >
      <span className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-r from-black/30 to-transparent" />
      {showText && (
        <span className="relative">
          <span className="font-serif block text-sm leading-tight font-semibold text-balance">
            {title}
          </span>
          {authors.length > 0 && (
            <span className="mt-1 block text-xs opacity-80">{authors.join(', ')}</span>
          )}
        </span>
      )}
    </div>
  )
}
