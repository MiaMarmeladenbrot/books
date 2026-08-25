import wasmUrl from '@undecaf/zbar-wasm/dist/zbar.wasm?url'
import { isbnFromEan13 } from './isbn'

export interface ScanResult {
  isbn: string | null
  symbols: number
}

type Reader = (image: ImageData) => Promise<string[]>

interface NativeDetector {
  detect: (source: ImageData) => Promise<{ rawValue: string }[]>
}

interface NativeConstructor {
  new (options?: { formats?: string[] }): NativeDetector
  getSupportedFormats?: () => Promise<string[]>
}

async function createNative(): Promise<Reader | null> {
  const constructor = (globalThis as Record<string, unknown>).BarcodeDetector as
    | NativeConstructor
    | undefined
  if (!constructor) return null

  try {
    const formats = await constructor.getSupportedFormats?.()
    if (formats && !formats.includes('ean_13')) return null
    const detector = new constructor({ formats: ['ean_13'] })
    await detector.detect(new ImageData(8, 8))
    return async (image) => (await detector.detect(image)).map((code) => code.rawValue)
  } catch {
    return null
  }
}

async function createWasm(): Promise<Reader> {
  const zbar = await import('@undecaf/zbar-wasm')
  zbar.setModuleArgs({ locateFile: () => wasmUrl })
  const scanner = await zbar.ZBarScanner.create()
  scanner.setConfig(zbar.ZBarSymbolType.ZBAR_NONE, zbar.ZBarConfigType.ZBAR_CFG_ENABLE, 0)
  scanner.setConfig(zbar.ZBarSymbolType.ZBAR_EAN13, zbar.ZBarConfigType.ZBAR_CFG_ENABLE, 1)
  return async (image) =>
    (await zbar.scanImageData(image, scanner)).map((symbol) => symbol.decode())
}

let reader: Promise<Reader> | null = null

export function loadDecoder() {
  reader = reader ?? createNative().then((native) => native ?? createWasm())
  return reader
}

export async function scanFrame(image: ImageData): Promise<ScanResult> {
  const values = await (await loadDecoder())(image)
  for (const value of values) {
    const isbn = isbnFromEan13(value)
    if (isbn) return { isbn, symbols: values.length }
  }
  return { isbn: null, symbols: values.length }
}
