export function coverForIsbn(isbn: string | null, fallback: number | null = null) {
  const asked = new URLSearchParams()
  if (isbn) asked.set('isbn', isbn)
  if (fallback) asked.set('cover', String(fallback))
  return asked.size > 0 ? `/api/cover?${asked}` : null
}
