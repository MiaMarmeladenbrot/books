import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Cover } from '../components/Cover'
import { TakeButton } from '../components/TakeButton'
import { coverSources } from '../lib/cover'
import { useAuth } from '../store/useAuth'
import { useRecommendations } from '../store/useRecommendations'
import { formatDay } from '../utils/format'
import type { FeedEntry } from '../types'

function Card({ entry }: { entry: FeedEntry }) {
  const userId = useAuth().user?.id ?? null

  const isMine = entry.user_id === userId
  const cover = coverSources(entry.isbn)

  return (
    <li className="border-line bg-card relative rounded-2xl border px-4 py-4">
      <Link
        to={`/empfehlung/${entry.id}`}
        aria-label={`${entry.title} — Empfehlung öffnen`}
        className="absolute inset-0 rounded-2xl"
      />

      <div className="flex items-center gap-2.5">
        <Avatar name={entry.profiles?.avatar ?? null} size={28} className="shrink-0" />
        <span className="truncate text-sm font-semibold">
          {isMine ? 'Du' : (entry.profiles?.display_name ?? 'Ohne Namen')}
        </span>
        <span className="text-ink-3 shrink-0 text-xs">
          {formatDay(entry.created_at.slice(0, 10))}
        </span>
      </div>

      <div className="mt-3.5 flex gap-4">
        <div className="w-16 shrink-0">
          <Cover title={entry.title} authors={entry.authors} src={cover} showText={false} />
        </div>
        <div className="min-w-0 grow">
          <h3 className="font-serif leading-tight font-semibold tracking-tight text-balance">
            {entry.title}
          </h3>
          {entry.authors.length > 0 && (
            <p className="text-ink-2 mt-1 text-sm">{entry.authors.join(', ')}</p>
          )}
          <p className="font-serif mt-2.5 text-sm leading-relaxed whitespace-pre-line italic">
            {entry.note}
          </p>

          <div className="relative">
            <TakeButton entry={entry} />
          </div>
        </div>
      </div>
    </li>
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
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Empfehlungen</h1>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-5">
        {error && <p className="text-danger mb-4 text-sm">{error}</p>}

        {feed === null ? (
          loadingFeed ? (
            <p className="text-ink-3 py-20 text-center text-sm">Lädt…</p>
          ) : null
        ) : feed.length === 0 ? (
          <p className="text-ink-2 py-20 text-center text-sm leading-relaxed text-balance">
            Noch hat niemand etwas empfohlen. Ein Buch, das du liest oder gelesen hast, kannst du
            auf seiner Seite empfehlen.
          </p>
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
