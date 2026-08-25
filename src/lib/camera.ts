interface CameraTweaks {
  focusMode?: string
  zoom?: number
  torch?: boolean
  pointsOfInterest?: { x: number; y: number }[]
}

function asConstraints(tweaks: CameraTweaks) {
  return { advanced: [tweaks] } as unknown as MediaTrackConstraints
}

export function videoTrack(stream: MediaStream | null) {
  return stream?.getVideoTracks()[0] ?? null
}

export async function apply(track: MediaStreamTrack | null, tweaks: CameraTweaks) {
  if (!track) return false
  try {
    await track.applyConstraints(asConstraints(tweaks))
    return true
  } catch {
    return false
  }
}

export async function keepFocusing(track: MediaStreamTrack | null) {
  return (await apply(track, { focusMode: 'continuous' })) || apply(track, { focusMode: 'auto' })
}

export async function focusOnce(track: MediaStreamTrack | null) {
  const nudged = await apply(track, { focusMode: 'single-shot' })
  if (!nudged) return keepFocusing(track)
  void keepFocusing(track)
  return true
}

export async function preferZoom(track: MediaStreamTrack | null, wanted: number) {
  if (!track) return 0
  const capabilities = (track.getCapabilities?.() ?? {}) as {
    zoom?: { min?: number; max?: number }
  }
  const range = capabilities.zoom
  if (!range || typeof range.max !== 'number') return 0

  const value = Math.max(range.min ?? 1, Math.min(wanted, range.max))
  return (await apply(track, { zoom: value })) ? value : 0
}

export function describeCamera(track: MediaStreamTrack | null) {
  if (!track) return ['keine Spur']
  const capabilities = (track.getCapabilities?.() ?? {}) as Record<string, unknown>
  const settings = track.getSettings() as Record<string, unknown>

  const interesting = ['focusMode', 'focusDistance', 'zoom', 'torch', 'exposureMode', 'frameRate']
  return interesting.map((key) => {
    const can = capabilities[key]
    const is = settings[key]
    const canText = Array.isArray(can)
      ? can.join('/')
      : can && typeof can === 'object'
        ? `${(can as { min?: number }).min}…${(can as { max?: number }).max}`
        : can === undefined
          ? 'kann nicht'
          : String(can)
    return `${key.padEnd(14)} ${canText}${is === undefined ? '' : `   jetzt ${String(is)}`}`
  })
}
