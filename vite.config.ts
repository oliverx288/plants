import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { checkPublicKey } from './src/lib/publicKey'

export default defineConfig(({ mode }) => {
  // Si la clave "pública" es en realidad una service role, el build FALLA: así nunca llega a desplegarse
  // un bundle con un secreto dentro (la comprobación en tiempo de ejecución solo avisa tarde).
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const keyProblem = env.VITE_SUPABASE_ANON_KEY ? checkPublicKey(env.VITE_SUPABASE_ANON_KEY.trim()) : null
  if (keyProblem) throw new Error(`[faro] Build cancelado. ${keyProblem}`)

  return {
    plugins: [react()],
    test: {
      // PGlite (Postgres en WASM) tarda unos segundos en arrancar, sobre todo con suites en paralelo.
      testTimeout: 30_000,
      hookTimeout: 30_000,
    },
  }
})
