import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { db } from '../lib/supabase'
import type { Profile, ProfileDraft } from '../types'
import { ProfileContext } from './profileContextValue'
import { useAuth } from './useAuth'

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const userId = useAuth().user?.id ?? null

  const reload = useCallback(async () => {
    if (!userId) return
    const { data, error: queryError } = await db
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (queryError) setError(queryError.message)
    else {
      setError(null)
      setProfile(data as Profile | null)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    // eslint-disable-next-line react/set-state-in-effect -- a fresh account waits behind the splash instead of showing the last one's name
    setLoading(true)
    void reload()
  }, [reload, userId])

  const saveProfile = useCallback(
    async (patch: Partial<ProfileDraft>) => {
      const { data, error: updateError } = await db
        .from('profiles')
        .update(patch)
        .eq('user_id', userId)
        .select('*')
        .single()
      if (updateError) throw new Error(updateError.message)
      const saved = data as Profile
      setProfile(saved)
      return saved
    },
    [userId],
  )

  return (
    <ProfileContext.Provider value={{ profile, loading, error, saveProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}
