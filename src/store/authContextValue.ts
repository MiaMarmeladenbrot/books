import { createContext } from 'react'
import type { User } from '@supabase/auth-js'

interface AuthValue {
  user: User | null
  loading: boolean
  recovering: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  requestReset: (email: string) => Promise<{ error: Error | null }>
  endRecovery: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)
