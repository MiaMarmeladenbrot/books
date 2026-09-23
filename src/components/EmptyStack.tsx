import type { CSSProperties } from 'react'
import { BOOKS } from './stackBooks'

const SCALE = 1.3
const HEIGHT = 19.5 * SCALE
const STEP = 24 * SCALE

const OUTLINE: Record<(typeof BOOKS)[number]['tint'], string> = {
  'bg-accent': 'border-accent bg-accent/15',
  'bg-leaf': 'border-leaf bg-leaf/15',
  'bg-ink-2': 'border-ink-2 bg-ink-2/15',
  'bg-accent/65': 'border-accent/70 bg-accent/10',
  'bg-leaf/60': 'border-leaf/70 bg-leaf/10',
}

const SLOTS = [...BOOKS].reverse()

function place(book: (typeof BOOKS)[number], slot: number): CSSProperties {
  const width = book.width * SCALE
  return {
    top: slot * STEP,
    width,
    height: HEIGHT,
    marginLeft: -width / 2 + book.offset * SCALE,
    '--tilt': book.tilt,
  } as CSSProperties
}

export function EmptyStack() {
  const first = BOOKS[0]
  return (
    <div aria-hidden className="relative h-[158px] w-[210px]">
      {SLOTS.map((book, slot) => (
        <div
          key={book.tint}
          className={`absolute left-1/2 rotate-(--tilt) rounded-[4px] border-[1.5px] border-dashed ${OUTLINE[book.tint]}`}
          style={place(book, slot)}
        />
      ))}
      <div
        className={`first-book absolute left-1/2 rounded-[4px] ${first.tint}`}
        style={place(first, SLOTS.length - 1)}
      >
        <span className="bg-paper/75 absolute inset-y-[4px] right-[4px] w-[12px] rounded-[2px]" />
      </div>
    </div>
  )
}
