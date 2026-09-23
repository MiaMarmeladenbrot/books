import type { CSSProperties } from 'react'
import { m } from '../paraglide/messages.js'
import { Scribble } from './Scribble'
import { BOOK_HEIGHT, BOOKS } from './stackBooks'

const CYCLE = 4.5

export function StackLoader() {
  return (
    <div className="relative h-[120px] w-[156px]" role="status" aria-label={m.loader_label()}>
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
          <Scribble
            width={book.width}
            height={BOOK_HEIGHT}
            words={book.words}
            seed={7 + index * 101}
          />
        </div>
      ))}
    </div>
  )
}
