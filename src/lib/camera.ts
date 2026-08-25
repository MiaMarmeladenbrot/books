export function videoTrack(stream: MediaStream | null) {
  return stream?.getVideoTracks()[0] ?? null
}

async function request(track: MediaStreamTrack, focusMode: string) {
  try {
    await track.applyConstraints({ advanced: [{ focusMode }] } as unknown as MediaTrackConstraints)
    return true
  } catch {
    return false
  }
}

export async function keepFocusing(track: MediaStreamTrack | null) {
  if (!track) return false
  return (await request(track, 'continuous')) || request(track, 'auto')
}
