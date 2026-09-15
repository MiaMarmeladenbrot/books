import { AuthClient } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'
import { StorageClient } from '@supabase/storage-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'VITE_SUPABASE_URL und VITE_SUPABASE_PUBLISHABLE_KEY fehlen — .env aus .env.example anlegen.',
  )
}

const project = new URL(url)

export const auth = new AuthClient({
  url: new URL('auth/v1', project).href,
  headers: { Authorization: `Bearer ${publishableKey}`, apikey: publishableKey },
  storageKey: `sb-${project.hostname.split('.')[0]}-auth-token`,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
})

const asCurrentUser: typeof fetch = async (input, init) => {
  const { data } = await auth.getSession()
  const headers = new Headers(init?.headers)
  if (!headers.has('apikey')) headers.set('apikey', publishableKey)
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${data.session?.access_token ?? publishableKey}`)
  }
  return fetch(input, { ...init, headers })
}

export const db = new PostgrestClient(new URL('rest/v1', project).href, {
  schema: 'public',
  fetch: asCurrentUser,
})

const storage = new StorageClient(new URL('storage/v1', project).href, {}, asCurrentUser)

const COVER_BUCKET = 'cover'

export function coverUrl(path: string | null) {
  if (!path) return null
  return storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function uploadCover(stem: string, image: Blob) {
  const safeStem = stem.replace(/[^A-Za-z0-9-]/g, '') || 'cover'
  const path = `${safeStem}-${Date.now()}.jpg`
  const { error } = await storage.from(COVER_BUCKET).upload(path, image, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
  })
  if (error) throw new Error(error.message)
  return path
}

export async function releaseCover(path: string) {
  const { data, error } = await db.rpc('cover_is_orphaned', { wanted: path })
  if (error || data !== true) return
  await storage.from(COVER_BUCKET).remove([path])
}
