import type { CSSProperties } from 'react'

const SPINES = [
  { left: 28, width: 24, height: 118, tint: 'bg-leaf/60', lean: '0deg' },
  { left: 55, width: 21, height: 136, tint: 'bg-ink-2', lean: '0deg' },
  { left: 132, width: 25, height: 124, tint: 'bg-accent', lean: '-12deg' },
  { left: 165, width: 22, height: 110, tint: 'bg-accent/65', lean: '-16deg' },
]

export function ShelfGap() {
  return (
    <div aria-hidden className="relative mx-auto h-[150px] w-[190px]">
      <div className="bg-line absolute inset-x-0 bottom-0 h-0.5 rounded-full" />
      {SPINES.map((spine) => (
        <div
          key={spine.left}
          className={`absolute bottom-0.5 origin-bottom-left rotate-(--lean) rounded-[3.5px] ${spine.tint}`}
          style={
            {
              left: spine.left,
              width: spine.width,
              height: spine.height,
              '--lean': spine.lean,
            } as CSSProperties
          }
        >
          <span className="bg-paper/75 absolute inset-x-[4px] top-[5px] h-[12px] rounded-[2px]" />
        </div>
      ))}
      <div className="border-ink-3/60 text-ink-3 absolute bottom-0.5 left-[81px] flex h-[126px] w-[26px] items-center justify-center rounded-[3.5px] border-[1.5px] border-dashed font-serif text-xl font-semibold">
        ?
      </div>
    </div>
  )
}
