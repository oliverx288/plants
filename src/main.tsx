import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './design/global.css'
import { App } from './App'
import { ConfigError } from './components/ConfigError'
import { supabaseConfigError } from './lib/supabase'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{supabaseConfigError ? <ConfigError message={supabaseConfigError} /> : <App />}</StrictMode>,
)
