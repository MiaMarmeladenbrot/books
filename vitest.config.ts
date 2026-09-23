import { defineConfig } from 'vitest/config'

const FLOW = 'src/lib/lookup.flow.test.ts'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'pure',
          environment: 'node',
          include: ['src/**/*.test.ts', 'api/**/*.test.ts', 'messages/*.test.ts'],
          exclude: [FLOW],
          env: { TZ: 'Europe/Berlin' },
        },
      },
      {
        test: {
          name: 'flow',
          environment: 'jsdom',
          include: [FLOW, 'src/**/*.test.tsx'],
          setupFiles: ['./src/test-setup.ts'],
          env: { TZ: 'Europe/Berlin' },
        },
      },
    ],
  },
})
