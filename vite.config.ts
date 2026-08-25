import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function serveApiRoutesInDevelopment() {
  return {
    name: 'serve-api-routes-in-development',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/cover', async (request, response) => {
        try {
          const module = await server.ssrLoadModule('/api/cover.ts')
          const url = new URL(request.originalUrl ?? '/', 'http://localhost')
          const result: Response = await module.default(new Request(url))
          response.statusCode = result.status
          result.headers.forEach((value, key) => response.setHeader(key, value))
          response.end(Buffer.from(await result.arrayBuffer()))
        } catch (error) {
          response.statusCode = 500
          response.end(error instanceof Error ? error.message : 'Fehler')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveApiRoutesInDevelopment()],
})
