import { createContext } from 'react'
import type { Profile, ProfileDraft } from '../types'

interface ProfileValue {
  profile: Profile | null
  loading: boolean
  error: string | null
  saveProfile: (patch: Partial<ProfileDraft>) => Promise<Profile>
}

export const ProfileContext = createContext<ProfileValue | null>(null)
