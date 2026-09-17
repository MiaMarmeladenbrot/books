import { createContext } from 'react'
import type { Book, FeedEntry, Recommendation } from '../types'

interface RecommendationsValue {
  mine: Recommendation[]
  feed: FeedEntry[] | null
  loadingFeed: boolean
  error: string | null
  loadFeed: () => Promise<void>
  recommend: (book: Book, note: string | null) => Promise<Recommendation>
  withdraw: (id: string) => Promise<void>
}

export const RecommendationsContext = createContext<RecommendationsValue | null>(null)
