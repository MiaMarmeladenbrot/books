import { ZBarScanner, scanImageData, setModuleArgs } from '@undecaf/zbar-wasm'
import wasmUrl from '@undecaf/zbar-wasm/dist/zbar.wasm?url'
import { isbnFromEan13 } from '../lib/isbn'
import { coverCrop } from '../lib/frame'

const video = document.querySelector<HTMLVideoElement>('#video')!
const guide = document.querySelector<HTMLDivElement>('#guide')!
const stats = document.querySelector<HTMLPreElement>('#stats')!
const startButton = document.querySelector<HTMLButtonElement>('#start')!
const shapeButton = document.querySelector<HTMLButtonElement>('#shape')!
const regionButton = document.querySelector<HTMLButtonElement>('#region')!
const copyButton = document.querySelector<HTMLButtonElement>('#copy')!

const CAMERA_TIMEOUT = 12000

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

function show(lines: string[]) {
  stats.textContent = lines.join('\n')
}

async function permissionLine() {
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
    return `Berechtigung laut Browser: ${status.state}`
  } catch {
    return 'Berechtigung: dieser Browser sagt es nicht'
  }
}

async function environment() {
  let cameras = '?'
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    cameras = String(devices.filter((device) => device.kind === 'videoinput').length)
  } catch {
    cameras = 'nicht abfragbar'
  }
  return [
    'Modul läuft. Auf „Kamera starten" tippen.',
    '',
    `isSecureContext   ${isSecureContext}`,
    `mediaDevices      ${navigator.mediaDevices ? 'da' : 'FEHLT'}`,
    `Kameras gefunden  ${cameras}`,
    await permissionLine(),
    `Viewport          ${innerWidth}×${innerHeight} CSS, DPR ${devicePixelRatio}`,
    '',
    navigator.userAgent,
  ]
}

function reset() {
  scans = 0
  hits = 0
  totalMs = 0
  tally.clear()
}

async function loop() {
  if (!running || !scanner) return

  if (video.videoWidth > 0) {
    const size = { width: video.videoWidth, height: video.videoHeight }
    const view = video.getBoundingClientRect()
    const box = guide.getBoundingClientRect()

    const crop = cropToGuide
      ? coverCrop(size, view, {
          x: box.left - view.left,
          y: box.top - view.top,
          width: box.width,
          height: box.height,
        })
      : { x: 0, y: 0, ...size }

    const scale = Math.min(1, 1024 / crop.width)
    canvas.width = Math.round(crop.width * scale)
    canvas.height = Math.round(crop.height * scale)
    context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)

    const started = performance.now()
    const symbols = await scanImageData(context.getImageData(0, 0, canvas.width, canvas.height), scanner)
    totalMs += performance.now() - started
    scans += 1

    if (symbols.length > 0) {
      hits += 1
      for (const symbol of symbols) {
        const raw = symbol.decode()
        tally.set(raw, (tally.get(raw) ?? 0) + 1)
      }
    }

    const cover = Math.max(view.width / size.width, view.height / size.height)
    const visible = view.width / cover
    const guidePixels = box.width / cover
    const modules = guidePixels / 95

    const track = stream?.getVideoTracks()[0]?.getSettings() ?? {}
    const ranked = [...tally.entries()].sort((first, second) => second[1] - first[1]).slice(0, 4)

    show([
      `Stream      ${size.width}×${size.height}   angefragt: ${portraitStream ? 'hochkant' : 'quer'}`,
      `Track sagt  ${track.width ?? '?'}×${track.height ?? '?'} @ ${track.frameRate ?? '?'} fps`,
      `Viewport    ${Math.round(view.width)}×${Math.round(view.height)} CSS   DPR ${devicePixelRatio}`,
      `cover       ×${cover.toFixed(3)}`,
      `SICHTBAR    ${Math.round(visible)} von ${size.width} px  =  ${Math.round((visible / size.width) * 100)}% der Breite`,
      `Rahmen      ${Math.round(box.width)} CSS  →  ${Math.round(guidePixels)} Quellpixel`,
      `GEFÜLLT     ${modules.toFixed(2)} px/Modul   (unter 2 geht nichts)`,
      ``,
      `liest       ${cropToGuide ? 'Rahmen' : 'ganzes Bild'} ${Math.round(crop.width)}×${Math.round(crop.height)} → ${canvas.width}×${canvas.height}`,
      `Scans       ${scans},  Symbol in ${Math.round((hits / scans) * 100)}%`,
      `Ø           ${(totalMs / scans).toFixed(1)} ms`,
      ...(ranked.length
        ? ranked.map(([value, count]) => `  ${String(count).padStart(4)}× ${value} ${isbnFromEan13(value) ? 'ok' : 'verworfen'}`)
        : ['  noch kein Code gelesen']),
    ])
  }

  setTimeout(loop, 90)
}

async function start() {
  stream?.getTracks().forEach((track) => track.stop())
  running = false
  show(['Kamera wird angefragt…'])

  if (!navigator.mediaDevices?.getUserMedia) {
    show([
      'DIESER BROWSER GIBT KEINE KAMERA HER',
      '',
      `navigator.mediaDevices: ${navigator.mediaDevices ? 'da' : 'fehlt'}`,
      `isSecureContext: ${isSecureContext}`,
      `Adresse: ${location.protocol}//${location.host}`,
    ])
    return
  }

  const shape = portraitStream
    ? { width: { ideal: 1080 }, height: { ideal: 1920 } }
    : { width: { ideal: 1920 }, height: { ideal: 1080 } }

  shapeButton.textContent = portraitStream ? 'Stream: hochkant' : 'Stream: quer'

  try {
    stream = await Promise.race([
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, ...shape },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), CAMERA_TIMEOUT)
      }),
    ])
  } catch (caught) {
    const name = caught instanceof Error ? caught.name : 'unbekannt'
    const text = caught instanceof Error ? caught.message : ''
    show(
      text === 'Timeout'
        ? [
            'KAMERA ANTWORTET NICHT',
            '',
            `Nach ${CAMERA_TIMEOUT / 1000} Sekunden kam weder eine Freigabe`,
            'noch eine Ablehnung. Meist heißt das: die Abfrage',
            'wurde unterdrückt, oder eine andere Seite hält die',
            'Kamera noch. Andere Tabs schließen und neu laden.',
            '',
            await permissionLine(),
          ]
        : [
            'KAMERA ABGELEHNT',
            '',
            `Fehler: ${name}`,
            text,
            '',
            await permissionLine(),
            '',
            'Im Schloss-Symbol der Adressleiste die Kamera',
            'freigeben, dann neu laden.',
          ]
    )
    return
  }

  video.srcObject = stream
  video.muted = true

  try {
    await video.play()
  } catch (caught) {
    show(['VIDEO STARTET NICHT', '', `Fehler: ${caught instanceof Error ? caught.name : 'unbekannt'}`])
    return
  }

  if (!scanner) {
    try {
      scanner = await ZBarScanner.create()
    } catch (caught) {
      show(['DECODER LÄDT NICHT', '', `Fehler: ${caught instanceof Error ? caught.message : 'unbekannt'}`])
      return
    }
  }

  reset()
  running = true
  startButton.textContent = 'Neu starten'
  void loop()
}

startButton.addEventListener('click', () => void start())

shapeButton.addEventListener('click', () => {
  portraitStream = !portraitStream
  shapeButton.textContent = portraitStream ? 'Stream: hochkant' : 'Stream: quer'
  if (running || stream) void start()
})

regionButton.addEventListener('click', () => {
  cropToGuide = !cropToGuide
  regionButton.textContent = cropToGuide ? 'Liest: Rahmen' : 'Liest: ganzes Bild'
  reset()
})

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(stats.textContent ?? '')
    copyButton.textContent = 'kopiert ✓'
    setTimeout(() => {
      copyButton.textContent = 'Text kopieren'
    }, 1500)
  } catch {
    copyButton.textContent = 'ging nicht'
  }
})

void environment().then(show)
