import type { CSSProperties } from 'react'

const BOOKS = [
  { width: 156, tint: 'bg-accent', tilt: '-1.4deg', offset: -3 },
  { width: 132, tint: 'bg-leaf', tilt: '1.2deg', offset: 4.5 },
  { width: 147, tint: 'bg-ink-2', tilt: '-0.5deg', offset: -1.5 },
  { width: 126, tint: 'bg-accent/65', tilt: '1.9deg', offset: 6 },
  { width: 141, tint: 'bg-leaf/60', tilt: '-1.1deg', offset: -4.5 },
]

const CYCLE = 4.5

export function StackLoader() {
  return (
    <div className="relative h-[120px] w-[156px]" role="status" aria-label="Lädt">
      {BOOKS.map((book, index) => (
        <div
          key={book.tint}
          aria-hidden
          className={`falling-book ${book.tint}`}
          style={
            {
              width: book.width,
              marginLeft: -book.width / 2 + book.offset,
              animationDelay: `${(-index * CYCLE) / BOOKS.length}s`,
              '--cycle': `${CYCLE}s`,
              '--tilt': book.tilt,
              '--i': index,
            } as CSSProperties
          }
        >
          <span className="absolute inset-y-[3px] right-[3px] w-[9px] rounded-[1.5px] bg-paper/75" />
        </div>
      ))}
    </div>
  )
}
