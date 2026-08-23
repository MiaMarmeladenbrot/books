const MAX_WIDTH = 800
const JPEG_QUALITY = 0.85

const MIN_COVER_BYTES = 5000
const MIN_COVER_WIDTH = 280
const MIN_COVER_RATIO = 0.5
const MAX_COVER_RATIO = 0.85

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export async function fetchCoverJpeg(url: string) {
  let blob: Blob
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    blob = await response.blob()
  } catch {
    return null
  }
  if (blob.size < MIN_COVER_BYTES) return null

  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()
    const ratio = image.naturalWidth / image.naturalHeight
    if (image.naturalWidth < MIN_COVER_WIDTH) return null
    if (ratio < MIN_COVER_RATIO || ratio > MAX_COVER_RATIO) return null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(objectUrl)
  }

  return await toCoverJpeg(blob)
}

export async function toCoverJpeg(file: Blob) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()

    const scale = Math.min(1, MAX_WIDTH / image.naturalWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Bild kann nicht verarbeitet werden')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob) throw new Error('Bild kann nicht umgewandelt werden')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}
