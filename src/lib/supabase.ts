import { AuthClient } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'
import { StorageClient } from '@supabase/storage-js'
import { isbnThirteen } from './isbn'
import { m } from '../paraglide/messages.js'

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
const SHARED_FOLDER = 'isbn'
const ALREADY_THERE = '409'

const COVER_UPLOAD = { contentType: 'image/jpeg', cacheControl: '31536000' }

export function coverUrl(path: string | null) {
  if (!path) return null
  return storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl
}

export function sharedCoverPath(isbn: string) {
  const thirteen = isbnThirteen(isbn)
  return thirteen ? `${SHARED_FOLDER}/${thirteen}.jpg` : null
}

export function ownCoverPath(userId: string, stem: string, stamp = Date.now()) {
  const safeStem = stem.replace(/[^A-Za-z0-9-]/g, '') || 'cover'
  return `${userId}/${safeStem}-${stamp}.jpg`
}

export function isSharedCover(path: string) {
  return path.startsWith(`${SHARED_FOLDER}/`)
}

async function currentUserId() {
  const { data } = await auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error(m.error_not_signed_in())
  return id
}

export async function uploadOwnCover(stem: string, image: Blob) {
  const path = ownCoverPath(await currentUserId(), stem)
  const { error } = await storage.from(COVER_BUCKET).upload(path, image, COVER_UPLOAD)
  if (error) throw new Error(error.message)
  return path
}

export async function uploadSharedCover(path: string, image: Blob) {
  const { error } = await storage.from(COVER_BUCKET).upload(path, image, COVER_UPLOAD)
  if (error && error.statusCode !== ALREADY_THERE) throw new Error(error.message)
  return path
}

export async function releaseCover(path: string) {
  if (isSharedCover(path)) return
  const { data, error } = await storage.from(COVER_BUCKET).remove([path])
  if (error) console.warn(`Cover ${path} nicht gelöscht: ${error.message}`)
  else if (data?.length === 0) console.warn(`Cover ${path} nicht gelöscht: abgelehnt`)
}
