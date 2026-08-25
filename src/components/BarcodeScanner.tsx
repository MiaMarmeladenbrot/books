import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { loadDecoder, scanFrame } from '../lib/barcode'
import { coverCrop } from '../lib/frame'
import { focusOnce, keepFocusing, videoTrack } from '../lib/camera'

const SCAN_WIDTH = 1024
const BOX_PADDING = 0.12
const SCAN_PAUSE = 90
const CONFIRMATIONS = 2
const SIGHTED_FOR = 1200
const STALLED_AFTER = 6000

type Phase = 'starting' | 'scanning' | 'denied' | 'unavailable'
type Hint = 'aiming' | 'sighted' | 'stalled'

const HINTS: Record<Hint, string> = {
  aiming: 'Barcode auf der Rückseite in den Rahmen halten',
  sighted: 'Barcode erkannt — kurz ruhig halten',
  stalled: 'Noch nichts gefunden. Etwas Abstand halten, bis das Bild scharf wird.',
}

interface Props {
  onDetected: (isbn: string) => void
  onClose: () => void
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const box = useRef<HTMLSpanElement>(null)
  const track = useRef<MediaStreamTrack | null>(null)
  const detected = useRef(onDetected)
  const [phase, setPhase] = useState<Phase>('starting')
  const [hint, setHint] = useState<Hint>('aiming')

  useEffect(() => {
    detected.current = onDetected
  }, [onDetected])

  useEffect(() => {
    let stopped = false
    let stream: MediaStream | null = null
    let timer: number | undefined
    let lastSeen: string | null = null
    let repeats = 0
    let scanningSince = 0
    let lastSymbolAt = 0
    let shownHint: Hint = 'aiming'

    const element = video.current
    const target = box.current
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })

    const cropForFrame = (source: HTMLVideoElement) => {
      const size = { width: source.videoWidth, height: source.videoHeight }
      const view = source.getBoundingClientRect()
      const guide = target?.getBoundingClientRect()
      if (!guide || view.width === 0) return { x: 0, y: 0, ...size }

      return coverCrop(size, view, {
        x: guide.left - view.left - guide.width * BOX_PADDING,
        y: guide.top - view.top - guide.height * BOX_PADDING,
        width: guide.width * (1 + BOX_PADDING * 2),
        height: guide.height * (1 + BOX_PADDING * 2),
      })
    }

    const scan = async () => {
      if (stopped || !context) return

      if (element && element.videoWidth > 0) {
        const crop = cropForFrame(element)
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

        let result
        try {
          result = await scanFrame(context.getImageData(0, 0, canvas.width, canvas.height))
        } catch {
          if (!stopped) setPhase('unavailable')
          return
        }
        if (stopped) return

        const now = performance.now()
        if (result.symbols > 0) lastSymbolAt = now

        if (result.isbn) {
          repeats = result.isbn === lastSeen ? repeats + 1 : 1
          lastSeen = result.isbn
          if (repeats >= CONFIRMATIONS) {
            stopped = true
            stopStream(stream)
            detected.current(result.isbn)
            return
          }
        }

        const nextHint: Hint =
          now - lastSymbolAt < SIGHTED_FOR
            ? 'sighted'
            : now - scanningSince > STALLED_AFTER
              ? 'stalled'
              : 'aiming'
        if (nextHint !== shownHint) {
          shownHint = nextHint
          setHint(nextHint)
        }
      }

      timer = window.setTimeout(scan, SCAN_PAUSE)
    }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !context) {
        setPhase('unavailable')
        return
      }

      void loadDecoder()

      const upright = window.innerHeight >= window.innerWidth
      const shape = upright
        ? { width: { ideal: 1080 }, height: { ideal: 1920 } }
        : { width: { ideal: 1920 }, height: { ideal: 1080 } }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, ...shape },
        })
      } catch (caught) {
        if (stopped) return
        const denied = caught instanceof DOMException && caught.name === 'NotAllowedError'
        setPhase(denied ? 'denied' : 'unavailable')
        return
      }

      if (stopped || !element) {
        stopStream(stream)
        return
      }

      element.srcObject = stream
      element.muted = true
      try {
        await element.play()
      } catch {
        if (!stopped) setPhase('unavailable')
        return
      }
      if (stopped) return

      track.current = videoTrack(stream)
      void keepFocusing(track.current)

      scanningSince = performance.now()
      setPhase('scanning')
      void scan()
    }

    void start()

    return () => {
      stopped = true
      window.clearTimeout(timer)
      stopStream(stream)
      track.current = null
      if (element) element.srcObject = null
    }
  }, [])

  if (phase === 'denied' || phase === 'unavailable') {
    return (
      <div className="bg-paper fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center">
        <p className="font-serif mb-2 text-base font-semibold">
          {phase === 'denied' ? 'Kein Zugriff auf die Kamera' : 'Scannen geht hier nicht'}
        </p>
        <p className="text-ink-2 mb-6 max-w-[34ch] text-sm leading-relaxed">
          {phase === 'denied'
            ? 'Die Kamera ist für diese Seite gesperrt. In den Browser-Einstellungen freigeben — oder die ISBN eintippen.'
            : 'Dieser Browser gibt keine Kamera her. Die ISBN steht als Zahl unter dem Barcode.'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="bg-accent w-full max-w-xs rounded-xl py-3.5 text-sm font-bold text-white"
        >
          Zurück zur Suche
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={video}
        playsInline
        autoPlay
        muted
        className="h-full w-full object-cover"
      />

      <div className="absolute inset-0 flex flex-col">
        <div className="flex justify-end p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Scannen abbrechen"
            className="rounded-full bg-black/50 p-2.5 text-white backdrop-blur"
          >
            <X size={22} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => void focusOnce(track.current)}
          aria-label="Scharfstellen"
          className="flex flex-1 flex-col items-center justify-center"
        >
          <span
            ref={box}
            className={`block aspect-[3/2] w-[80%] max-w-[40rem] rounded-lg ring-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-colors ${
              phase === 'scanning' && hint === 'sighted' ? 'ring-leaf' : 'ring-white/80'
            }`}
          />
          <span className="mt-6 block max-w-[30ch] text-center text-sm leading-relaxed text-white/90">
            {phase === 'starting' ? 'Kamera startet…' : HINTS[hint]}
          </span>
          {phase === 'scanning' && (
            <span className="mt-2 block text-xs text-white/60">Zum Scharfstellen tippen</span>
          )}
        </button>
      </div>
    </div>
  )
}
