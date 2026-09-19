import { useState } from 'react'
import { hueFromTitle, spineGradient } from '../utils/spine'

const COVER_SHAPE =
  'relative aspect-[5/8] overflow-hidden rounded-sm shadow-[0_1px_2px_rgb(30_26_21/0.18),0_10px_20px_-10px_rgb(30_26_21/0.45)] [content-visibility:auto] [contain-intrinsic-size:auto_15rem]'

interface CoverProps {
  title: string
  authors: string[]
  src?: string | null
  showText?: boolean
  className?: string
}

export function Cover({ title, authors, src, showText = true, className = '' }: CoverProps) {
  const [settled, setSettled] = useState<{ src: string; arrived: boolean } | null>(null)
  const known = settled?.src === src ? settled : null

  if (src && !(known && !known.arrived)) {
    return (
      <div className={`${COVER_SHAPE} bg-shade w-full ${className}`}>
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setSettled({ src, arrived: true })}
          onError={() => setSettled({ src, arrived: false })}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {!known && (
          <span aria-hidden className="bg-line absolute inset-0 overflow-hidden">
            <span className="catalogue-sweep absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent via-white/70 to-transparent" />
          </span>
        )}
      </div>
    )
  }

  const background = spineGradient(hueFromTitle(title))

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
