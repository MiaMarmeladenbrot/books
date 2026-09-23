import { defineConfig } from '@inlang/paraglide-js'

export default defineConfig({
  outdir: './src/paraglide',
  strategy: ['localStorage', 'preferredLanguage', 'baseLocale'],
  emitTsDeclarations: true,
})
