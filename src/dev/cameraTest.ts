import { ZBarScanner, scanImageData, setModuleArgs } from '@undecaf/zbar-wasm'
import wasmUrl from '@undecaf/zbar-wasm/dist/zbar.wasm?url'
import { isbnFromEan13 } from '../lib/isbn'
import { coverCrop } from '../lib/frame'

const video = document.querySelector<HTMLVideoElement>('#video')!
const guide = document.querySelector<HTMLDivElement>('#guide')!
const stats = document.querySelector<HTMLPreElement>('#stats')!
const report = document.querySelector<HTMLDivElement>('#report')!
const shapeButton = document.querySelector<HTMLButtonElement>('#shape')!
const regionButton = document.querySelector<HTMLButtonElement>('#region')!

const canvas = document.createElement('canvas')
const context = canvas.getContext('2d', { willReadFrequently: true })!

setModuleArgs({ locateFile: () => wasmUrl })

let scanner: ZBarScanner | null = null
let stream: MediaStream | null = null
let running = false
let portraitStream = true
let cropToGuide = true
let scans = 0
let hits = 0
let totalMs = 0
const tally = new Map<string, number>()

function log(text: string) {
  const row = document.createElement('div')
  row.textContent = text
  report.prepend(row)
}

function reset() {
  scans = 0
  hits = 0
  totalMs = 0
  tally.clear()
}

function guideCrop() {
  const size = { width: video.videoWidth, height: video.videoHeight }
  const view = video.getBoundingClientRect()
  const box = guide.getBoundingClientRect()
  return coverCrop(size, view, {
    x: box.left - view.left,
    y: box.top - view.top,
    width: box.width,
    height: box.height,
  })
}

async function loop() {
  if (!running || !scanner) return

  if (video.videoWidth > 0) {
    const size = { width: video.videoWidth, height: video.videoHeight }
    const view = video.getBoundingClientRect()
    const crop = cropToGuide ? guideCrop() : { x: 0, y: 0, ...size }
    const scale = Math.min(1, 1024 / crop.width)

    canvas.width = Math.round(crop.width * scale)
    canvas.height = Math.round(crop.height * scale)
    context.drawImage(
      video,
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
    const symbols = await scanImageData(
      context.getImageData(0, 0, canvas.width, canvas.height),
      scanner
    )
    totalMs += performance.now() - started
    scans += 1

    if (symbols.length > 0) {
      hits += 1
      for (const symbol of symbols) {
        const raw = symbol.decode()
        tally.set(raw, (tally.get(raw) ?? 0) + 1)
      }
    }

    const coverScale = Math.max(view.width / size.width, view.height / size.height)
    const visibleWidth = view.width / coverScale
    const box = guide.getBoundingClientRect()
    const filledModules = (box.width / coverScale) / 95
    const ranked = [...tally.entries()].sort((first, second) => second[1] - first[1]).slice(0, 4)

    stats.textContent = [
      `Stream        ${size.width}×${size.height}  (${portraitStream ? 'hochkant angefragt' : 'quer angefragt'})`,
      `Viewport CSS  ${Math.round(view.width)}×${Math.round(view.height)}   DPR ${devicePixelRatio}`,
      `cover-Faktor  ${coverScale.toFixed(3)}`,
      `sichtbar      ${Math.round(visibleWidth)} von ${size.width} px Breite  (${Math.round((visibleWidth / size.width) * 100)}%)`,
      `Rahmen        ${Math.round(box.width)} CSS → ${Math.round(box.width / coverScale)} Quellpixel`,
      `gefüllt wären ${filledModules.toFixed(2)} px pro Modul   (2 ist die Grenze)`,
      ``,
      `gelesen       ${cropToGuide ? `Rahmen ${Math.round(crop.width)}×${Math.round(crop.height)}` : 'ganzes Bild'} → ${canvas.width}×${canvas.height}`,
      `Scans         ${scans},  Symbol in ${scans ? Math.round((hits / scans) * 100) : 0}%`,
      `Ø pro Scan    ${scans ? (totalMs / scans).toFixed(1) : '0'} ms`,
      ...(ranked.length
        ? ['', ...ranked.map(([value, count]) => `  ${String(count).padStart(4)}×  ${value}  ${isbnFromEan13(value) ? 'ISBN ok' : 'verworfen'}`)]
        : ['', 'noch kein Code gelesen']),
    ].join('\n')
  }

  setTimeout(loop, 90)
}

async function start() {
  stream?.getTracks().forEach((track) => track.stop())
  running = false

  const shape = portraitStream
    ? { width: { ideal: 1080 }, height: { ideal: 1920 } }
    : { width: { ideal: 1920 }, height: { ideal: 1080 } }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, ...shape },
    })
  } catch (caught) {
    log(`getUserMedia abgelehnt: ${caught instanceof Error ? caught.name : 'unbekannt'}`)
    return
  }

  video.srcObject = stream
  video.muted = true
  await video.play()

  if (!scanner) {
    scanner = await ZBarScanner.create()
    log('Decoder bereit, alle Symbologien aktiv')
  }

  reset()
  running = true
  void loop()
}

shapeButton.addEventListener('click', () => {
  portraitStream = !portraitStream
  shapeButton.textContent = portraitStream ? 'Stream: hochkant' : 'Stream: quer'
  log(`--- Stream neu angefragt: ${portraitStream ? 'hochkant' : 'quer'} ---`)
  void start()
})

regionButton.addEventListener('click', () => {
  cropToGuide = !cropToGuide
  regionButton.textContent = cropToGuide ? 'Liest: Rahmen' : 'Liest: ganzes Bild'
  reset()
  log(`--- liest jetzt ${cropToGuide ? 'nur den Rahmen' : 'das ganze Bild'} ---`)
})

void start()
