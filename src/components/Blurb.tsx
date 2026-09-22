import { useEffect, useRef, useState } from 'react'

const PRAISE = /^[»„“"']/
const PRAISE_LENGTH = 220

const WAITING_WIDTHS = ['w-full', 'w-11/12', 'w-10/12', 'w-2/3']

function WaitingBlurb() {
  return (
    <div className="mt-6" aria-hidden>
      <p className="text-ink-3 mb-1.5 text-xs font-bold tracking-widest uppercase">Klappentext</p>
      <div className="flex flex-col gap-3 py-1.5">
        {WAITING_WIDTHS.map((width) => (
          <span key={width} className={`bg-shade h-2.5 rounded-full ${width}`} />
        ))}
      </div>
    </div>
  )
}

export function Blurb({ text, asking = false }: { text: string | null; asking?: boolean }) {
  const [open, setOpen] = useState(false)
  const [clipped, setClipped] = useState(false)
  const preview = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const element = preview.current
    setClipped(element ? element.scrollHeight > element.clientHeight + 1 : false)
  }, [text])

  if (!text) return asking ? <WaitingBlurb /> : null

  const paragraphs = text
    .split('\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const opensWithPraise =
    paragraphs.length > 1 && PRAISE.test(paragraphs[0]) && paragraphs[0].length <= PRAISE_LENGTH
  const teaser = opensWithPraise ? paragraphs.slice(1) : paragraphs

  return (
    <div className="mt-6">
      <p className="text-ink-3 mb-1.5 text-xs font-bold tracking-widest uppercase">Klappentext</p>

      {open ? (
        <>
          <div className="text-ink-2 flex flex-col gap-2.5 text-sm leading-relaxed">
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-accent mt-2 text-xs font-bold"
          >
            Weniger
          </button>
        </>
      ) : (
        <div className="relative">
          <p ref={preview} className="text-ink-2 line-clamp-4 text-sm leading-relaxed">
            {teaser.join(' ')}
          </p>
          {clipped && (
            <div className="from-paper/0 via-paper/85 to-paper absolute inset-x-0 bottom-0 bg-gradient-to-b pt-10">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-accent text-xs font-bold"
              >
                Weiterlesen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
