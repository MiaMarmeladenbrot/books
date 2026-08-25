import { useEffect, useRef, useState } from 'react'
import { loadDecoder, scanFrame } from '../lib/barcode'
import { coverCrop } from '../lib/frame'
import { apply, describeCamera, focusOnce, keepFocusing, videoTrack } from '../lib/camera'

const SCAN_WIDTH = 1024
const SCAN_PAUSE = 90
const CAMERA_TIMEOUT = 12000

type Shape = 'upright' | 'wide'
type Region = 'guide' | 'full'

function shapeFor(shape: Shape) {
  return shape === 'upright'
    ? { width: { ideal: 1080 }, height: { ideal: 1920 } }
    : { width: { ideal: 1920 }, height: { ideal: 1080 } }
}

async function permissionState() {
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
    return status.state
  } catch {
    return 'sagt dieser Browser nicht'
  }
}

async function cameraCount() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return String(devices.filter((device) => device.kind === 'videoinput').length)
  } catch {
    return 'nicht abfragbar'
  }
}

export function CameraDiagnose() {
  const video = useRef<HTMLVideoElement>(null)
  const guide = useRef<HTMLDivElement>(null)
  const live = useRef<MediaStream | null>(null)
  const [zoom, setZoom] = useState(1)
  const [shape, setShape] = useState<Shape>(
    window.innerHeight >= window.innerWidth ? 'upright' : 'wide'
  )
  const [region, setRegion] = useState<Region>('guide')
  const [attempt, setAttempt] = useState(0)
  const [report, setReport] = useState('Auf „Kamera starten" tippen.')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const lines = [
        'Bereit. Auf „Kamera starten" tippen.',
        '',
        `isSecureContext   ${isSecureContext}`,
        `mediaDevices      ${navigator.mediaDevices ? 'da' : 'FEHLT'}`,
        `Kameras           ${await cameraCount()}`,
        `Berechtigung      ${await permissionState()}`,
        `Fenster           ${innerWidth}×${innerHeight} CSS, DPR ${devicePixelRatio}`,
        '',
        navigator.userAgent,
      ]
      if (!cancelled) setReport(lines.join('\n'))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (attempt === 0) return

    let stopped = false
    let stream: MediaStream | null = null
    let timer: number | undefined
    let scans = 0
    let seen = 0
    let totalMs = 0
    const tally = new Map<string, number>()

    const element = video.current
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })

    const stop = () => stream?.getTracks().forEach((track) => track.stop())

    const scan = async () => {
      if (stopped || !context || !element || element.videoWidth === 0) {
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

      const started = performance.now()
      const result = await scanFrame(context.getImageData(0, 0, canvas.width, canvas.height))
      totalMs += performance.now() - started
      scans += 1
      if (result.symbols > 0) seen += 1
      if (result.isbn) tally.set(result.isbn, (tally.get(result.isbn) ?? 0) + 1)
      if (stopped) return

      const cover = Math.max(view.width / size.width, view.height / size.height)
      const visible = view.width / cover
      const guidePixels = target ? target.width / cover : view.width / cover
      const ranked = [...tally.entries()].sort((first, second) => second[1] - first[1]).slice(0, 4)

      setReport(
        [
          ...describeCamera(videoTrack(stream)),
          '',
          `Stream       ${size.width}×${size.height}   angefragt ${shape === 'upright' ? 'hochkant' : 'quer'}`,
          `Fenster      ${Math.round(view.width)}×${Math.round(view.height)} CSS, DPR ${devicePixelRatio}`,
          `cover        ×${cover.toFixed(3)}`,
          `SICHTBAR     ${Math.round(visible)} von ${size.width} px = ${Math.round((visible / size.width) * 100)}% der Breite`,
          `Rahmen       ${Math.round(target?.width ?? 0)} CSS → ${Math.round(guidePixels)} Quellpixel`,
          `GEFÜLLT      ${(guidePixels / 95).toFixed(2)} px/Modul   (unter 2 geht nichts)`,
          '',
          `liest        ${region === 'guide' ? 'Rahmen' : 'ganzes Bild'} ${Math.round(crop.width)}×${Math.round(crop.height)} → ${canvas.width}×${canvas.height}`,
          `Scans        ${scans}, Symbol in ${Math.round((seen / scans) * 100)}%`,
          `Ø            ${(totalMs / scans).toFixed(1)} ms`,
          '',
          ...(ranked.length
            ? ranked.map(([value, count]) => `  ${count}× ${value}`)
            : ['  noch kein Code gelesen']),
        ].join('\n')
      )

      timer = window.setTimeout(scan, SCAN_PAUSE)
    }

    void (async () => {
      setReport('Kamera wird angefragt…')
      if (!navigator.mediaDevices?.getUserMedia || !context) {
        setReport(`KEINE KAMERA-API\n\nisSecureContext ${isSecureContext}\n${location.href}`)
        return
      }

      void loadDecoder()

      try {
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, ...shapeFor(shape) },
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), CAMERA_TIMEOUT)
          }),
        ])
      } catch (caught) {
        const name = caught instanceof Error ? caught.name : 'unbekannt'
        const message = caught instanceof Error ? caught.message : ''
        setReport(
          message === 'Timeout'
            ? `KAMERA ANTWORTET NICHT\n\nNach ${CAMERA_TIMEOUT / 1000} s kam weder Freigabe noch Ablehnung.\nMeist unterdrückte Abfrage oder eine andere Seite hält die Kamera.\n\nBerechtigung ${await permissionState()}`
            : `KAMERA ABGELEHNT\n\n${name}\n${message}\n\nBerechtigung ${await permissionState()}`
        )
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
      } catch (caught) {
        setReport(`VIDEO STARTET NICHT\n\n${caught instanceof Error ? caught.name : 'unbekannt'}`)
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
  }, [attempt, shape, region])

  const buttonClass = 'border-line rounded-lg border bg-black/60 px-3 py-3 text-xs text-white'

  return (
    <div className="fixed inset-0 bg-black">
      <video ref={video} playsInline autoPlay muted className="h-full w-full object-cover" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="aspect-[3/2] w-[80%] max-w-[40rem] rounded-lg ring-2 ring-white/80" ref={guide} />
      </div>

      <pre className="absolute top-0 right-0 left-0 m-0 bg-black/75 p-2.5 text-[11px] leading-snug whitespace-pre-wrap text-white">
        {report}
      </pre>

      <div className="absolute right-0 bottom-0 left-0 grid grid-cols-2 gap-2 bg-black/75 p-2.5">
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="bg-accent col-span-2 rounded-lg py-3 text-sm font-bold text-white"
        >
          Kamera starten
        </button>
        <button
          type="button"
          onClick={() => setShape(shape === 'upright' ? 'wide' : 'upright')}
          className={buttonClass}
        >
          Stream: {shape === 'upright' ? 'hochkant' : 'quer'}
        </button>
        <button
          type="button"
          onClick={() => setRegion(region === 'guide' ? 'full' : 'guide')}
          className={buttonClass}
        >
          Liest: {region === 'guide' ? 'Rahmen' : 'ganzes Bild'}
        </button>
        <button
          type="button"
          onClick={() => void focusOnce(videoTrack(live.current))}
          className={buttonClass}
        >
          Scharfstellen
        </button>
        <button
          type="button"
          onClick={() => {
            const next = zoom >= 3 ? 1 : zoom + 1
            setZoom(next)
            void apply(videoTrack(live.current), { zoom: next })
          }}
          className={buttonClass}
        >
          Zoom {zoom}×
        </button>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(report)}
          className={`${buttonClass} col-span-2`}
        >
          Text kopieren
        </button>
      </div>
    </div>
  )
}
