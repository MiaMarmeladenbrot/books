import wasmUrl from '@undecaf/zbar-wasm/dist/zbar.wasm?url'
import { isbnFromEan13 } from './isbn'

async function createDecoder() {
  const zbar = await import('@undecaf/zbar-wasm')
  zbar.setModuleArgs({ locateFile: () => wasmUrl })
  const scanner = await zbar.ZBarScanner.create()
  scanner.setConfig(zbar.ZBarSymbolType.ZBAR_NONE, zbar.ZBarConfigType.ZBAR_CFG_ENABLE, 0)
  scanner.setConfig(zbar.ZBarSymbolType.ZBAR_EAN13, zbar.ZBarConfigType.ZBAR_CFG_ENABLE, 1)
  return { zbar, scanner }
}

let decoder: ReturnType<typeof createDecoder> | null = null

export function loadDecoder() {
  decoder = decoder ?? createDecoder()
  return decoder
}

export interface ScanResult {
  isbn: string | null
  symbols: number
}

export async function scanFrame(image: ImageData): Promise<ScanResult> {
  const { zbar, scanner } = await loadDecoder()
  const symbols = await zbar.scanImageData(image, scanner)
  for (const symbol of symbols) {
    const isbn = isbnFromEan13(symbol.decode())
    if (isbn) return { isbn, symbols: symbols.length }
  }
  return { isbn: null, symbols: symbols.length }
}
