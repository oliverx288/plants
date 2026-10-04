/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del proyecto de Supabase (pública). */
  readonly VITE_SUPABASE_URL?: string
  /** Clave anon/publishable de Supabase (pública por diseño; la protección es RLS). */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
