import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { loadDecoder, scanFrame } from '../lib/barcode'

const SCAN_WIDTH = 1280
const SCAN_PAUSE = 90
const CONFIRMATIONS = 2
const SIGHTED_FOR = 1200
const STALLED_AFTER = 6000

type Phase = 'starting' | 'scanning' | 'denied' | 'unavailable'
type Hint = 'aiming' | 'sighted' | 'stalled'

const HINTS: Record<Hint, string> = {
  aiming: 'Barcode auf der Rückseite in den Rahmen halten',
  sighted: 'Barcode erkannt — kurz ruhig halten',
  stalled: 'Noch nichts gefunden. Buch flach halten und den Barcode ganz ins Bild bringen.',
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
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })

    const scan = async () => {
      if (stopped || !context) return

      if (element && element.videoWidth > 0) {
        const scale = Math.min(1, SCAN_WIDTH / element.videoWidth)
        canvas.width = Math.round(element.videoWidth * scale)
        canvas.height = Math.round(element.videoHeight * scale)
        context.drawImage(element, 0, 0, canvas.width, canvas.height)

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

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
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

      scanningSince = performance.now()
      setPhase('scanning')
      void scan()
    }

    void start()

    return () => {
      stopped = true
      window.clearTimeout(timer)
      stopStream(stream)
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

        <div className="flex flex-1 flex-col items-center justify-center">
          <div
            className={`aspect-[5/2] w-[78%] max-w-sm rounded-lg ring-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-colors ${
              phase === 'scanning' && hint === 'sighted' ? 'ring-leaf' : 'ring-white/80'
            }`}
          />
          <p className="mt-6 max-w-[30ch] text-center text-sm leading-relaxed text-white/90">
            {phase === 'starting' ? 'Kamera startet…' : HINTS[hint]}
          </p>
        </div>
      </div>
    </div>
  )
}
