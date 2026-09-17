import { useContext } from 'react'
import { ProfileContext } from './profileContextValue'

export function useProfile() {
  const value = useContext(ProfileContext)
  if (!value) throw new Error('useProfile braucht einen ProfileProvider')
  return value
}
