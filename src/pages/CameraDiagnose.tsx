import { useEffect, useRef, useState } from 'react'
import { nativeReader, wasmReader, type Reader } from '../lib/barcode'
import { coverCrop } from '../lib/frame'
import { describeCamera, focusOnce, keepFocusing, preferZoom, videoTrack } from '../lib/camera'
import { isbnFromEan13 } from '../lib/isbn'

const SCAN_WIDTH = 1024
const SCAN_PAUSE = 60
const CAMERA_TIMEOUT = 12000

type Region = 'guide' | 'full'

interface Score {
  scans: number
  hits: number
  isbns: number
  ms: number
  last: string
}

function emptyScore(): Score {
  return { scans: 0, hits: 0, isbns: 0, ms: 0, last: '' }
}

function line(label: string, score: Score, available: boolean) {
  if (!available) return `${label.padEnd(8)} nicht verfügbar`
  if (score.scans === 0) return `${label.padEnd(8)} noch nichts`
  const rate = Math.round((score.hits / score.scans) * 100)
  const good = Math.round((score.isbns / score.scans) * 100)
  return `${label.padEnd(8)} ${String(rate).padStart(3)}% gelesen, ${String(good).padStart(3)}% als ISBN, ${(score.ms / score.scans).toFixed(1)} ms  ${score.last}`
}

async function permissionState() {
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
    return status.state
  } catch {
    return 'sagt dieser Browser nicht'
  }
}

export function CameraDiagnose() {
  const video = useRef<HTMLVideoElement>(null)
  const guide = useRef<HTMLDivElement>(null)
  const live = useRef<MediaStream | null>(null)
  const [region, setRegion] = useState<Region>('guide')
  const [zoom, setZoom] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [report, setReport] = useState('Auf „Kamera starten" tippen.')

  useEffect(() => {
    if (attempt === 0) return

    let stopped = false
    let stream: MediaStream | null = null
    let timer: number | undefined

    const element = video.current
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })

    const scores: Record<'native' | 'wasm', Score> = { native: emptyScore(), wasm: emptyScore() }
    let readers: { native: Reader | null; wasm: Reader } | null = null

    const stop = () => stream?.getTracks().forEach((track) => track.stop())

    const measure = async (key: 'native' | 'wasm', reader: Reader, image: ImageData) => {
      const started = performance.now()
      const values = await reader(image)
      const score = scores[key]
      score.ms += performance.now() - started
      score.scans += 1
      if (values.length > 0) {
        score.hits += 1
        const isbn = values.map(isbnFromEan13).find(Boolean)
        if (isbn) {
          score.isbns += 1
          score.last = isbn
        } else {
          score.last = `${values[0]} verworfen`
        }
      }
    }

    const scan = async () => {
      if (stopped || !context || !element || !readers || element.videoWidth === 0) {
        timer = window.setTimeout(scan, SCAN_PAUSE)
        return
      }

      const size = { width: element.videoWidth, height: element.videoHeight }
      const view = element.getBoundingClientRect()
      const target = guide.current?.getBoundingClientRect()

      const crop =
        region === 'guide' && target
          ? coverCrop(size, view, {
              x: target.left - view.left,
              y: target.top - view.top,
              width: target.width,
              height: target.height,
            })
          : { x: 0, y: 0, ...size }

      const scale = Math.min(1, SCAN_WIDTH / crop.width)
      canvas.width = Math.round(crop.width * scale)
      canvas.height = Math.round(crop.height * scale)
      context.drawImage(
        element,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        canvas.width,
        canvas.height
      )

      const image = context.getImageData(0, 0, canvas.width, canvas.height)
      if (readers.native) await measure('native', readers.native, image)
      await measure('wasm', readers.wasm, image)
      if (stopped) return

      const cover = Math.max(view.width / size.width, view.height / size.height)
      const guidePixels = (target?.width ?? view.width) / cover

      setReport(
        [
          'GLEICHE BILDER, BEIDE DECODER',
          line('native', scores.native, readers.native !== null),
          line('zbar', scores.wasm, true),
          '',
          `Stream    ${size.width}×${size.height}   Zoom ${zoom}×`,
          `sichtbar  ${Math.round((view.width / cover / size.width) * 100)}% der Breite`,
          `Rahmen    ${(guidePixels / 95).toFixed(2)} px/Modul`,
          `liest     ${region === 'guide' ? 'Rahmen' : 'ganzes Bild'} → ${canvas.width}×${canvas.height}`,
          '',
          ...describeCamera(videoTrack(stream)),
        ].join('\n')
      )

      timer = window.setTimeout(scan, SCAN_PAUSE)
    }

    void (async () => {
      setReport('Kamera wird angefragt…')
      if (!navigator.mediaDevices?.getUserMedia || !context) {
        setReport(`KEINE KAMERA-API\n\nisSecureContext ${isSecureContext}`)
        return
      }

      readers = { native: await nativeReader(), wasm: await wasmReader() }

      try {
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), CAMERA_TIMEOUT)
          }),
        ])
      } catch (caught) {
        const name = caught instanceof Error ? caught.name : 'unbekannt'
        setReport(`KAMERA NICHT DA\n\n${name}\n\nBerechtigung ${await permissionState()}`)
        return
      }

      if (stopped || !element) {
        stop()
        return
      }

      element.srcObject = stream
      element.muted = true
      try {
        await element.play()
      } catch {
        setReport('VIDEO STARTET NICHT')
        return
      }

      live.current = stream
      void keepFocusing(videoTrack(stream))
      void scan()
    })()

    return () => {
      stopped = true
      window.clearTimeout(timer)
      stop()
      live.current = null
      if (element) element.srcObject = null
    }
  }, [attempt, region, zoom])

  const buttonClass = 'border-line rounded-lg border bg-black/60 px-2 py-3 text-xs text-white'

  return (
    <div className="fixed inset-0 bg-black">
      <video ref={video} playsInline autoPlay muted className="h-full w-full object-cover" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          ref={guide}
          className="aspect-[3/2] w-[80%] max-w-[40rem] rounded-lg ring-2 ring-white/80"
        />
      </div>

      <pre className="absolute top-0 right-0 left-0 m-0 bg-black/80 p-2.5 text-[11px] leading-snug whitespace-pre-wrap text-white">
        {report}
      </pre>

      <div className="absolute right-0 bottom-0 left-0 grid grid-cols-3 gap-2 bg-black/80 p-2.5">
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="bg-accent col-span-3 rounded-lg py-3 text-sm font-bold text-white"
        >
          Kamera starten
        </button>
        <button type="button" onClick={() => setRegion(region === 'guide' ? 'full' : 'guide')} className={buttonClass}>
          {region === 'guide' ? 'Rahmen' : 'ganzes Bild'}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = zoom >= 4 ? 1 : zoom + 1
            setZoom(next)
            void preferZoom(videoTrack(live.current), next)
          }}
          className={buttonClass}
        >
          Zoom {zoom}×
        </button>
        <button type="button" onClick={() => void focusOnce(videoTrack(live.current))} className={buttonClass}>
          Fokus
        </button>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(report)}
          className={`${buttonClass} col-span-3`}
        >
          Text kopieren
        </button>
      </div>
    </div>
  )
}
