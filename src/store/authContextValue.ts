import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'

export interface AuthValue {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
