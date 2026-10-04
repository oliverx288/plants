import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // PGlite (Postgres en WASM) tarda unos segundos en arrancar, sobre todo con suites en paralelo.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
