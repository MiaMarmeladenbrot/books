import { useContext } from 'react'
import { RecommendationsContext } from './recommendationsContextValue'

export function useRecommendations() {
  const value = useContext(RecommendationsContext)
  if (!value) throw new Error('useRecommendations braucht einen RecommendationsProvider')
  return value
}
