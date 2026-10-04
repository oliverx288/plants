import { supabase } from '../lib/supabase'
import { parseChunk } from './chunk'
import type { RetrievedChunk } from './types'

export { parseChunk }

const MAX_CHUNKS = 3

/** Recupera los fragmentos más relevantes (la búsqueda y la puntuación ocurren en la base de datos). */
export async function retrieveChunks(question: string): Promise<RetrievedChunk[]> {
  const { data, error } = await supabase.rpc('search_knowledge', {
    query_text: question,
    max_results: MAX_CHUNKS,
  })
  if (error) throw new Error('No se pudo consultar la base de conocimiento')
  return ((data ?? []) as unknown[]).map(parseChunk)
}
