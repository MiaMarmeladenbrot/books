import { Avatar } from './Avatar'
import { useAuth } from '../store/useAuth'
import { formatDay } from '../utils/format'
import { m } from '../paraglide/messages.js'
import type { FeedEntry } from '../types'

export function Recommender({ entry, className = '' }: { entry: FeedEntry; className?: string }) {
  const isMine = entry.user_id === (useAuth().user?.id ?? null)
  const name = entry.profiles?.display_name ?? m.profile_no_name()

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <Avatar name={entry.profiles?.avatar ?? null} size={28} className="shrink-0" />
      <div className="min-w-0 text-left">
        <p className="truncate text-sm leading-tight font-semibold">
          {isMine ? m.feed_recommended_by_you() : m.feed_recommended_by({ name })}
        </p>
        <p className="text-ink-3 text-xs leading-tight">
          {formatDay(entry.created_at.slice(0, 10))}
        </p>
      </div>
    </div>
  )
}
