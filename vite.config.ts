import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

const API_ROUTES = ['cover', 'books', 'catalogue']

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
    serveApiRoutesInDevelopment(mode),
  ],
}))
