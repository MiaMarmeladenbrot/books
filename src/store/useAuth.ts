import { useContext } from 'react'
import { AuthContext } from './authContextValue'

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth braucht einen AuthProvider')
  return value
}
