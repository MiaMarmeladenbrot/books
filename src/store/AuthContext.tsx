import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/auth-js'
import { auth } from '../lib/supabase'
import { AuthContext } from './authContextValue'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    setRecovering(false)
    await auth.signOut()
  }

  const requestReset = async (email: string) => {
    const { error } = await auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    })
    return { error: error as Error | null }
  }

  const endRecovery = () => setRecovering(false)

  return (
    <AuthContext.Provider
      value={{ user, loading, recovering, signIn, signOut, requestReset, endRecovery }}
    >
      {children}
    </AuthContext.Provider>
  )
}
