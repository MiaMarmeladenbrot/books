import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Library } from 'lucide-react'
import { Cover } from '../components/Cover'
import { CoverSeal } from '../components/CoverSeal'
import { Recommender } from '../components/Recommender'
import { Scribble, type Word } from '../components/Scribble'
import { TakeButton } from '../components/TakeButton'
import { coverSources } from '../lib/cover'
import { useRecommendations } from '../store/useRecommendations'
import { m } from '../paraglide/messages.js'
import type { FeedEntry } from '../types'

function Card({ entry }: { entry: FeedEntry }) {
  return (
    <li className="border-line bg-card relative rounded-2xl border p-3.5 sm:p-4">
      <Link
        to={`/empfehlung/${entry.id}`}
        aria-label={m.feed_card_open({ title: entry.title })}
        className="absolute inset-0 rounded-2xl"
      />

      <div className="flex gap-3.5 sm:gap-4">
        <div className="pointer-events-none w-20 shrink-0 sm:w-24">
          <Cover title={entry.title} authors={entry.authors} src={coverSources(entry.isbn)} />
        </div>

        <div className="min-w-0 grow">
          <Recommender entry={entry} />

          <p className="font-serif text-ink mt-2.5 line-clamp-4 text-[0.9375rem] leading-snug whitespace-pre-line italic sm:mt-3 sm:line-clamp-none sm:text-base">
            »{entry.note}«
          </p>

          <div className="text-ink-2 mt-2.5 text-xs sm:mt-3">
            <h3 className="text-ink block truncate font-semibold sm:inline">{entry.title}</h3>
            {entry.authors.length > 0 && (
              <span className="block truncate sm:inline">
                <span className="hidden sm:inline"> · </span>
                {entry.authors.join(', ')}
              </span>
            )}
          </div>

          <div className="relative">
            <TakeButton entry={entry} />
          </div>
        </div>
      </div>
    </li>
  )
}

const FANNED = [
  {
    tint: 'bg-leaf/60',
    place: 'left-[22px] top-[22px] h-[128px] w-[80px] -rotate-9',
    lines: [
      { top: 90, words: [[12, 40]] },
      { top: 100, words: [[12, 24], [40, 18]] },
      { top: 114, words: [[12, 30]], small: true },
    ],
  },
  {
    tint: 'bg-ink-2',
    place: 'left-[100px] top-[20px] h-[128px] w-[80px] rotate-8',
    lines: [
      { top: 92, words: [[12, 28], [44, 20]] },
      { top: 102, words: [[12, 36]] },
      { top: 116, words: [[12, 22]], small: true },
    ],
  },
  {
    tint: 'bg-accent',
    place: 'left-[56px] top-[12px] h-[144px] w-[90px]',
    lines: [
      { top: 100, words: [[14, 34], [52, 24]] },
      { top: 111, words: [[14, 42]] },
      { top: 126, words: [[14, 26], [44, 16]], small: true },
    ],
  },
] satisfies {
  tint: string
  place: string
  lines: { top: number; words: Word[]; small?: boolean }[]
}[]

function CoverFan() {
  return (
    <div aria-hidden className="relative h-[170px] w-[200px]">
      {FANNED.map((cover, index) => (
        <div
          key={cover.tint}
          className={`absolute rounded-[3px] shadow-[0_1px_2px_rgb(30_26_21/0.18),0_10px_20px_-10px_rgb(30_26_21/0.45)] ${cover.place} ${cover.tint}`}
        >
          <div className="absolute inset-0 overflow-hidden rounded-[3px]">
            <span className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-r from-black/25 to-transparent" />
            {cover.lines.map((line) => {
              const height = line.small ? 17 : 24
              return (
                <div
                  key={line.top}
                  className="absolute inset-x-0"
                  style={{ top: line.top - height / 2, height }}
                >
                  <Scribble
                    width={index === 2 ? 90 : 80}
                    height={height}
                    words={line.words}
                    seed={11 + index * 53 + line.top}
                  />
                </div>
              )
            })}
          </div>
          {index === FANNED.length - 1 && (
            <CoverSeal recommended={false} label={m.recommend_action()} size="md" />
          )}
        </div>
      ))}
    </div>
  )
}

export function Feed() {
  const { feed, loadingFeed, error, loadFeed } = useRecommendations()

  useEffect(() => {
    void loadFeed()
  }, [loadFeed])

  return (
    <div className="pb-28">
      <header className="border-line sticky top-0 z-10 border-b bg-paper/95 px-4 pt-3 pb-3 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">{m.feed_title()}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-5">
        {error && <p className="text-danger mb-4 text-sm">{error}</p>}

        {feed === null ? (
          loadingFeed ? (
            <p className="text-ink-3 py-20 text-center text-sm">{m.app_loading()}</p>
          ) : null
        ) : feed.length === 0 ? (
          <div className="mx-auto flex max-w-xs flex-col items-center py-14 text-center">
            <CoverFan />
            <p className="font-serif mt-8 mb-2 text-xl font-semibold tracking-tight text-balance">
              {m.feed_empty()}
            </p>
            <p className="text-ink-2 mb-6 text-sm leading-relaxed">{m.feed_empty_body()}</p>
            <Link
              to="/"
              className="border-line bg-card text-ink-2 flex w-full items-center justify-center gap-2 rounded-xl border py-3.5 text-sm font-semibold"
            >
              <Library size={18} strokeWidth={1.9} />
              {m.feed_empty_action()}
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {feed.map((entry) => (
              <Card key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
