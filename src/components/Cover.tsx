import { hueFromTitle } from '../utils/format'
import type { Book } from '../types'

interface CoverProps {
  book: Pick<Book, 'title' | 'authors'>
  showText?: boolean
  className?: string
}

export function Cover({ book, showText = true, className = '' }: CoverProps) {
  const hue = hueFromTitle(book.title)
  const background = `linear-gradient(150deg, hsl(${hue} 34% 40%), hsl(${(hue + 28) % 360} 30% 26%))`

  return (
    <div
      className={`relative flex aspect-2/3 flex-col justify-end overflow-hidden rounded-[5px] text-white shadow-[0_1px_2px_rgb(30_26_21/0.18),0_10px_20px_-10px_rgb(30_26_21/0.45)] ${showText ? 'py-3 pr-3 pl-4' : ''} ${className}`}
      style={{ background }}
    >
      <span className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-r from-black/30 to-transparent" />
      {showText && (
        <span className="relative">
          <span className="font-serif block text-sm leading-tight font-semibold text-balance">
            {book.title}
          </span>
          {book.authors.length > 0 && (
            <span className="mt-1 block text-[10.5px] opacity-80">{book.authors.join(', ')}</span>
          )}
        </span>
      )}
    </div>
  )
}
