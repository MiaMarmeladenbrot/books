export interface Size {
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function coverCrop(video: Size, view: Size, box: Rect): Rect {
  if (video.width <= 0 || video.height <= 0 || view.width <= 0 || view.height <= 0) {
    return { x: 0, y: 0, width: Math.max(1, video.width), height: Math.max(1, video.height) }
  }

  const scale = Math.max(view.width / video.width, view.height / video.height)
  const hidden = {
    x: (video.width * scale - view.width) / 2,
    y: (video.height * scale - view.height) / 2,
  }

  const x = Math.max(0, Math.min((box.x + hidden.x) / scale, video.width))
  const y = Math.max(0, Math.min((box.y + hidden.y) / scale, video.height))

  return {
    x,
    y,
    width: Math.max(1, Math.min(box.width / scale, video.width - x)),
    height: Math.max(1, Math.min(box.height / scale, video.height - y)),
  }
}
