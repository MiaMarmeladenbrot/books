export type Word = readonly [start: number, length: number]

type Props = {
  width: number
  height: number
  words: readonly Word[]
  upright?: boolean
  seed: number
}

function zigzag({ width, height, words, upright, seed }: Props) {
  const cross = upright ? width : height
  const middle = cross / 2
  const reach = cross * 0.14
  const step = cross * 0.1
  let state = seed
  const random = () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }

  return words
    .map(([start, length]) => {
      const points: string[] = []
      let flip = true
      for (let along = start; along <= start + length; along += step) {
        const offset = reach * (0.4 + 0.6 * random()) * (flip ? -1 : 1)
        const across = (middle + offset).toFixed(1)
        points.push(upright ? `${across} ${along.toFixed(1)}` : `${along.toFixed(1)} ${across}`)
        flip = !flip
      }
      return `M${points.join(' L')}`
    })
    .join(' ')
}

export function Scribble(props: Props) {
  const cross = props.upright ? props.width : props.height
  return (
    <svg
      aria-hidden
      width={props.width}
      height={props.height}
      viewBox={`0 0 ${props.width} ${props.height}`}
      className="text-paper/70 absolute inset-0"
    >
      <path
        d={zigzag(props)}
        fill="none"
        stroke="currentColor"
        strokeWidth={cross * 0.055}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
