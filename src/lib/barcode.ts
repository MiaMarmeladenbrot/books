import wasmUrl from '@undecaf/zbar-wasm/dist/zbar.wasm?url'
import { isbnFromEan13 } from './isbn'

export type Engine = 'native' | 'wasm'

export type Reader = (image: ImageData) => Promise<string[]>

export interface ScanResult {
  isbn: string | null
  symbols: number
  engine: Engine
}

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

let native: Promise<Reader | null> | null = null
let wasm: Promise<Reader> | null = null

export function nativeReader() {
  native = native ?? createNative()
  return native
}

export function wasmReader() {
  wasm = wasm ?? createWasm()
  return wasm
}

export async function loadDecoder() {
  return (await nativeReader()) ?? wasmReader()
}

export async function scanFrame(image: ImageData, prefer?: Engine): Promise<ScanResult> {
  const read = prefer === 'wasm' ? null : await nativeReader()
  const engine: Engine = read ? 'native' : 'wasm'
  const values = await (read ?? (await wasmReader()))(image)

  for (const value of values) {
    const isbn = isbnFromEan13(value)
    if (isbn) return { isbn, symbols: values.length, engine }
  }
  return { isbn: null, symbols: values.length, engine }
}
