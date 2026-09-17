import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { db } from '../lib/supabase'
import type { Book, FeedEntry, Recommendation } from '../types'
import { RecommendationsContext } from './recommendationsContextValue'
import { useAuth } from './useAuth'

const FEED_LIMIT = 60

export function RecommendationsProvider({ children }: { children: ReactNode }) {
  const [mine, setMine] = useState<Recommendation[]>([])
  const [feed, setFeed] = useState<FeedEntry[] | null>(null)
  const [loadingFeed, setLoadingFeed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const asked = useRef(false)
  const userId = useAuth().user?.id ?? null

  const reloadMine = useCallback(async () => {
    if (!userId) return
    const { data, error: queryError } = await db
      .from('recommendations')
      .select('*')
      .eq('user_id', userId)
    if (!queryError) setMine(data as Recommendation[])
  }, [userId])

  useEffect(() => {
    if (!userId) return
    // eslint-disable-next-line react/set-state-in-effect -- a fresh account starts empty instead of carrying the last one's recommendations
    setMine([])
    void reloadMine()
  }, [reloadMine, userId])

  const loadFeed = useCallback(async () => {
    if (asked.current) return
    asked.current = true
    setLoadingFeed(true)
    const { data, error: queryError } = await db
      .from('recommendations')
      .select('*, profiles(display_name, avatar)')
      .order('created_at', { ascending: false })
      .limit(FEED_LIMIT)
    if (queryError) {
      setError(queryError.message)
      asked.current = false
    } else {
      setError(null)
      setFeed(data as FeedEntry[])
    }
    setLoadingFeed(false)
  }, [])

  const recommend = useCallback(async (book: Book, note: string | null) => {
    const { data, error: insertError } = await db
      .from('recommendations')
      .insert({
        book_id: book.id,
        title: book.title,
        authors: book.authors,
        isbn: book.isbn,
        note,
      })
      .select('*')
      .single()
    if (insertError) throw new Error(insertError.message)
    const made = data as Recommendation
    setMine((current) => [made, ...current])
    asked.current = false
    setFeed(null)
    return made
  }, [])

  const withdraw = useCallback(async (id: string) => {
    const { error: deleteError } = await db.from('recommendations').delete().eq('id', id)
    if (deleteError) throw new Error(deleteError.message)
    setMine((current) => current.filter((entry) => entry.id !== id))
    setFeed((current) => current?.filter((entry) => entry.id !== id) ?? null)
  }, [])

  return (
    <RecommendationsContext.Provider
      value={{ mine, feed, loadingFeed, error, loadFeed, recommend, withdraw }}
    >
      {children}
    </RecommendationsContext.Provider>
  )
}
