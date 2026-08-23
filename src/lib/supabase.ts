import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'VITE_SUPABASE_URL und VITE_SUPABASE_PUBLISHABLE_KEY fehlen — .env aus .env.example anlegen.',
  )
}

export const supabase = createClient(url, publishableKey)

const COVER_BUCKET = 'cover'

export function coverUrl(path: string | null) {
  if (!path) return null
  return supabase.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function uploadCover(stem: string, image: Blob) {
  const safeStem = stem.replace(/[^A-Za-z0-9-]/g, '') || 'cover'
  const path = `${safeStem}-${Date.now()}.jpg`
  const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, image, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
  })
  if (error) throw new Error(error.message)
  return path
}

export async function removeCover(path: string) {
  await supabase.storage.from(COVER_BUCKET).remove([path])
}
