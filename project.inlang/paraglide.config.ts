import { defineConfig } from '@inlang/paraglide-js'

export default defineConfig({
  outdir: './src/paraglide',
  strategy: ['localStorage', 'baseLocale'],
  emitTsDeclarations: true,
})
