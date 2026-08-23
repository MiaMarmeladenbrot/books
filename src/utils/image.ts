const MAX_WIDTH = 800
const JPEG_QUALITY = 0.85

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export async function toCoverJpeg(file: File) {
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
