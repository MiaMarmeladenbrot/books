import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

const API_ROUTES = ['cover', 'books', 'catalogue']

const MANIFEST_FOR = (locale: string) => `manifest-${locale}.webmanifest`

function manifestPerLocale() {
  const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'))

  const locales = (): string[] => read('project.inlang/settings.json').locales

  const manifest = (locale: string) => {
    const description = read(`messages/${locale}.json`).manifest_description
    if (typeof description !== 'string') {
      throw new Error(`messages/${locale}.json is missing manifest_description`)
    }
    return JSON.stringify(
      { ...read('public/manifest.webmanifest'), lang: locale, description },
      null,
      2,
    )
  }

  return {
    name: 'manifest-per-locale',
    configureServer(server: ViteDevServer) {
      for (const locale of locales()) {
        server.middlewares.use(`/${MANIFEST_FOR(locale)}`, (_request, response) => {
          response.setHeader('Content-Type', 'application/manifest+json')
          response.end(manifest(locale))
        })
      }
    },
    generateBundle(this: { emitFile: (file: unknown) => void }) {
      for (const locale of locales()) {
        this.emitFile({
          type: 'asset',
          fileName: MANIFEST_FOR(locale),
          source: manifest(locale),
        })
      }
    },
  }
}

function serveApiRoutesInDevelopment(mode: string) {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    name: 'serve-api-routes-in-development',
    configureServer(server: ViteDevServer) {
      for (const route of API_ROUTES) {
        server.middlewares.use(`/api/${route}`, async (request, response) => {
          try {
            const module = await server.ssrLoadModule(`/api/${route}.ts`)
            const url = new URL(request.originalUrl ?? '/', 'http://localhost')
            const result: Response = await module.default(new Request(url))
            response.statusCode = result.status
            result.headers.forEach((value, key) => response.setHeader(key, value))
            response.setHeader('Cache-Control', 'no-store')
            response.end(Buffer.from(await result.arrayBuffer()))
          } catch (error) {
            response.statusCode = 500
            response.end(error instanceof Error ? error.message : 'Fehler')
          }
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  server: { port: 5180, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    paraglideVitePlugin({ project: './project.inlang' }),
    manifestPerLocale(),
    serveApiRoutesInDevelopment(mode),
  ],
}))
