import type { SupabaseClient } from '@supabase/supabase-js'

/*
 * Pruebas de intrusión contra la API de Supabase: un agente (y alguien sin sesión) intenta hacer lo que
 * NO debe. Se ejecuta contra el proyecto real con `npm run security:live`.
 *
 * Diseño para no engañarse a uno mismo:
 *  - Los ataques se dirigen a un ARTÍCULO TEMPORAL creado por la editora, nunca a los reales.
 *  - La respuesta de la API no basta (un UPDATE bloqueado por RLS no da error: da 0 filas, y un error podría
 *    esconder un cambio que sí ocurrió). Tras cada ataque la EDITORA vuelve a leer la base de datos y se
 *    comprueba que nada cambió.
 *  - Hay controles positivos (lo que SÍ está permitido) para demostrar que el arnés distingue ambos casos.
 *  - Todo lo temporal se borra al terminar.
 */

export type Actor = 'sin sesión' | 'agente' | 'editor'

export interface AttemptResult {
  id: string
  actor: Actor
  action: string
  expected: 'bloqueado' | 'permitido'
  /** Lo que respondió la API (código y mensaje, o nº de filas). */
  response: string
  /** Lo que se comprobó leyendo la base de datos después. */
  verification: string
  pass: boolean
}

export interface RawResponse {
  status: number
  body: unknown
}

export interface Env {
  anon: SupabaseClient
  agent: SupabaseClient
  editor: SupabaseClient
  /** POST directo a /rest/v1/<tabla> con el token del agente, sin usar la librería (como haría curl o fetch en DevTools). */
  rawPost: (table: string, body: unknown, accessToken: string) => Promise<RawResponse>
}

interface Res {
  data: unknown
  error: { code?: string; message?: string } | null
}

type Kind = 'error' | 'zero-rows' | 'rows' | 'ok'

export function responseOf(res: Res): { kind: Kind; text: string } {
  if (res.error) return { kind: 'error', text: `error ${res.error.code ?? '?'}: ${(res.error.message ?? '').slice(0, 90)}` }
  if (Array.isArray(res.data)) {
    return res.data.length === 0
      ? { kind: 'zero-rows', text: '0 filas afectadas/devueltas' }
      : { kind: 'rows', text: `${res.data.length} fila(s)` }
  }
  return { kind: 'ok', text: 'ok' }
}

const isBlocked = (kind: Kind) => kind === 'error' || kind === 'zero-rows'

interface Context {
  tempId: string
  tempTitle: string
  tempCategory: string
  tempSections: string[]
  markerQuestion: string
  markerQuestionId: string
  agentId: string
  editorId: string
  marker: string
}

interface Check {
  ok: boolean
  note: string
}

export async function runSecurityAttempts(env: Env): Promise<{ results: AttemptResult[]; cleanup: string }> {
  const { anon, agent, editor } = env
  const results: AttemptResult[] = []
  const marker = `[prueba-seguridad ${Date.now()}]`

  // ---------------------------------------------------------------- preparación (como editora)
  const agentId = (await agent.auth.getUser()).data.user?.id
  const editorId = (await editor.auth.getUser()).data.user?.id
  if (!agentId || !editorId) throw new Error('No se pudo identificar a los usuarios de prueba.')

  const tempTitle = `${marker} Artículo temporal`
  const tempCategory = 'Pruebas de seguridad'
  const created = await editor.rpc('save_article', {
    p_id: null,
    p_title: tempTitle,
    p_category: tempCategory,
    p_last_reviewed_at: '2026-01-01',
    p_sections: [
      { heading: 'Sección uno', body: 'Texto uno', steps: ['Paso uno'] },
      { heading: 'Sección dos', body: 'Texto dos', steps: [] },
    ],
  })
  if (created.error || typeof created.data !== 'string') {
    throw new Error(`La editora no pudo crear el artículo temporal: ${created.error?.message ?? 'respuesta inesperada'}`)
  }
  const tempId = created.data

  const markerQuestion = `${marker} ¿pregunta temporal?`
  const logged = await agent.rpc('log_unanswered_question', { question_text: markerQuestion })
  if (logged.error) throw new Error(`El agente no pudo registrar la pregunta temporal: ${logged.error.message}`)
  const q = await editor.from('unanswered_questions').select('id').eq('question', markerQuestion).maybeSingle()
  const markerQuestionId = (q.data as { id: string } | null)?.id
  if (!markerQuestionId) throw new Error('No se encontró la pregunta temporal que acaba de registrar el agente.')

  const ctx: Context = {
    tempId, tempTitle, tempCategory, tempSections: ['Sección uno', 'Sección dos'],
    markerQuestion, markerQuestionId, agentId, editorId, marker,
  }

  // ---------------------------------------------------------------- verificaciones (siempre como editora)
  const readTemp = async () =>
    (await editor
      .from('articles')
      .select('id, title, category, article_sections(heading, position)')
      .eq('id', ctx.tempId)
      .maybeSingle()).data as
      | { title: string; category: string; article_sections: { heading: string; position: number }[] }
      | null

  const tempUnchanged = async (): Promise<Check> => {
    const t = await readTemp()
    if (!t) return { ok: false, note: 'el artículo temporal YA NO EXISTE' }
    const headings = [...t.article_sections].sort((a, b) => a.position - b.position).map((s) => s.heading)
    const same =
      t.title === ctx.tempTitle && t.category === ctx.tempCategory && JSON.stringify(headings) === JSON.stringify(ctx.tempSections)
    return same
      ? { ok: true, note: 'el artículo temporal sigue idéntico (título, categoría y secciones)' }
      : { ok: false, note: `el artículo temporal CAMBIÓ: «${t.title}», ${headings.length} secciones` }
  }

  const noRowsWithMarker = async (table: 'articles' | 'profiles' | 'unanswered_questions', col: string, text: string): Promise<Check> => {
    const r = await editor.from(table).select('id').ilike(col, `%${text}%`)
    const n = Array.isArray(r.data) ? r.data.length : 0
    return n === 0 ? { ok: true, note: 'no se creó ninguna fila nueva' } : { ok: false, note: `SE CREARON ${n} fila(s)` }
  }

  const questionUnchanged = async (): Promise<Check> => {
    const r = await editor.from('unanswered_questions').select('id, question, resolved').eq('id', ctx.markerQuestionId).maybeSingle()
    const row = r.data as { question: string; resolved: boolean } | null
    if (!row) return { ok: false, note: 'la pregunta temporal YA NO EXISTE' }
    return row.question === ctx.markerQuestion && row.resolved === false
      ? { ok: true, note: 'la pregunta sigue idéntica y pendiente' }
      : { ok: false, note: 'la pregunta CAMBIÓ' }
  }

  const roleUnchanged = async (): Promise<Check> => {
    const r = await editor.from('profiles').select('role').eq('id', ctx.agentId).maybeSingle()
    const role = (r.data as { role: string } | null)?.role
    return role === 'agent' ? { ok: true, note: 'el rol del agente sigue siendo «agent»' } : { ok: false, note: `el rol ahora es «${role}»` }
  }

  const nothing = async (): Promise<Check> => ({ ok: true, note: 'sin efectos que verificar' })

  // ---------------------------------------------------------------- ejecución de intentos
  async function attempt(
    id: string, actor: Actor, action: string, expected: 'bloqueado' | 'permitido',
    attack: () => PromiseLike<Res>, verify: () => Promise<Check>,
  ) {
    let response: { kind: Kind; text: string }
    try {
      response = responseOf(await attack())
    } catch (error) {
      response = { kind: 'error', text: `excepción: ${error instanceof Error ? error.message.slice(0, 90) : String(error)}` }
    }
    const check = await verify()
    const responseOk = expected === 'bloqueado' ? isBlocked(response.kind) : !isBlocked(response.kind)
    results.push({ id, actor, action, expected, response: response.text, verification: check.note, pass: responseOk && check.ok })
  }

  const err = (message: string): Res => ({ data: null, error: { message } })
  const articleRow = (title: string) => ({ title, category: 'X' })

  // ---- Sin sesión (solo la clave pública)
  await attempt('S1', 'sin sesión', 'Leer artículos', 'bloqueado', () => anon.from('articles').select('id').limit(5), nothing)
  await attempt('S2', 'sin sesión', 'Ejecutar la búsqueda del asistente', 'bloqueado', () => anon.rpc('search_knowledge', { query_text: 'batería', max_results: 3 }), nothing)
  await attempt('S3', 'sin sesión', 'Insertar un artículo', 'bloqueado', () => anon.from('articles').insert(articleRow(`${marker} anon`)).select(), () => noRowsWithMarker('articles', 'title', `${marker} anon`))
  await attempt('S4', 'sin sesión', 'Llamar a save_article', 'bloqueado', () => anon.rpc('save_article', { p_id: null, p_title: `${marker} anon rpc`, p_category: 'X', p_last_reviewed_at: '2026-01-01', p_sections: [{ heading: 'a', body: 'b', steps: [] }] }), () => noRowsWithMarker('articles', 'title', `${marker} anon rpc`))
  await attempt('S5', 'sin sesión', 'Leer perfiles y preguntas sin respuesta', 'bloqueado', async () => {
    const [p, u] = await Promise.all([anon.from('profiles').select('id').limit(5), anon.from('unanswered_questions').select('id').limit(5)])
    const leaked = (Array.isArray(p.data) ? p.data.length : 0) + (Array.isArray(u.data) ? u.data.length : 0)
    return leaked === 0 ? (p.error || u.error ? err('permission denied') : { data: [], error: null }) : { data: [1], error: null }
  }, nothing)

  // ---- Control positivo: el agente SÍ puede leer
  await attempt('A1', 'agente', 'Leer artículos (control positivo: debe poder)', 'permitido', () => agent.from('articles').select('id').eq('id', ctx.tempId), nothing)

  // ---- Agente intenta escribir artículos y secciones
  await attempt('A2', 'agente', 'Insertar un artículo (API, librería)', 'bloqueado', () => agent.from('articles').insert(articleRow(`${marker} insertado por el agente`)).select(), () => noRowsWithMarker('articles', 'title', `${marker} insertado por el agente`))

  await attempt('A3', 'agente', 'Insertar un artículo (API REST directa con fetch y su token)', 'bloqueado', async () => {
    const token = (await agent.auth.getSession()).data.session?.access_token ?? ''
    const raw = await env.rawPost('articles', articleRow(`${marker} fetch directo`), token)
    const body = raw.body as { code?: string; message?: string } | null
    const blocked = raw.status >= 400
    return blocked
      ? { data: null, error: { code: String(body?.code ?? raw.status), message: `HTTP ${raw.status} ${body?.message ?? ''}` } }
      : { data: [body], error: null }
  }, () => noRowsWithMarker('articles', 'title', `${marker} fetch directo`))

  await attempt('A4', 'agente', 'Insertar una sección en un artículo existente', 'bloqueado', () => agent.from('article_sections').insert({ article_id: ctx.tempId, position: 9, heading: 'Inyectada', body: 'x', steps: [] }).select(), tempUnchanged)
  await attempt('A5', 'agente', 'Editar el título y la categoría de un artículo', 'bloqueado', () => agent.from('articles').update({ title: `${marker} HACKEADO`, category: 'Hackeado' }).eq('id', ctx.tempId).select(), tempUnchanged)
  await attempt('A6', 'agente', 'Editar el texto de una sección', 'bloqueado', () => agent.from('article_sections').update({ heading: 'HACKEADA' }).eq('article_id', ctx.tempId).select(), tempUnchanged)
  await attempt('A7', 'agente', 'Borrar las secciones de un artículo', 'bloqueado', () => agent.from('article_sections').delete().eq('article_id', ctx.tempId).select(), tempUnchanged)
  await attempt('A8', 'agente', 'Borrar un artículo', 'bloqueado', () => agent.from('articles').delete().eq('id', ctx.tempId).select(), tempUnchanged)
  await attempt('A9', 'agente', 'Crear un artículo con la función save_article', 'bloqueado', () => agent.rpc('save_article', { p_id: null, p_title: `${marker} por rpc`, p_category: 'X', p_last_reviewed_at: '2026-01-01', p_sections: [{ heading: 'a', body: 'b', steps: [] }] }), () => noRowsWithMarker('articles', 'title', `${marker} por rpc`))
  await attempt('A10', 'agente', 'Editar un artículo con la función save_article', 'bloqueado', () => agent.rpc('save_article', { p_id: ctx.tempId, p_title: `${marker} editado por rpc`, p_category: 'Hackeado', p_last_reviewed_at: '2026-01-01', p_sections: [{ heading: 'a', body: 'b', steps: [] }] }), tempUnchanged)

  // ---- Agente intenta escalar privilegios
  await attempt('A11', 'agente', 'Ascenderse a editor (UPDATE de su perfil)', 'bloqueado', () => agent.from('profiles').update({ role: 'editor' }).eq('id', ctx.agentId).select(), roleUnchanged)
  await attempt('A12', 'agente', 'Crear un perfil de editor para sí mismo (upsert)', 'bloqueado', () => agent.from('profiles').upsert({ id: ctx.agentId, role: 'editor', display_name: 'Lucía' }).select(), roleUnchanged)
  await attempt('A13', 'agente', 'Leer los perfiles de los demás (solo debe ver el suyo)', 'bloqueado', async () => {
    const r = await agent.from('profiles').select('id')
    const ids = Array.isArray(r.data) ? (r.data as { id: string }[]).map((x) => x.id) : []
    return ids.length === 1 && ids[0] === ctx.agentId ? { data: [], error: null } : { data: ids, error: r.error }
  }, nothing)
  await attempt('A14', 'agente', 'Usar la API de administración de usuarios con su sesión', 'bloqueado', () => agent.auth.admin.listUsers(), nothing)

  // ---- Agente y las preguntas sin respuesta
  await attempt('A15', 'agente', 'Leer las preguntas sin respuesta', 'bloqueado', () => agent.from('unanswered_questions').select('id, question').limit(5), nothing)
  await attempt('A16', 'agente', 'Registrar una pregunta a nombre de otra persona (user_id falso)', 'bloqueado', () => agent.from('unanswered_questions').insert({ question: `${marker} suplantada`, user_id: ctx.editorId }), () => noRowsWithMarker('unanswered_questions', 'question', `${marker} suplantada`))
  await attempt('A17', 'agente', 'Registrar una pregunta de 301 caracteres', 'bloqueado', () => agent.rpc('log_unanswered_question', { question_text: `${marker} ${'x'.repeat(301)}` }), () => noRowsWithMarker('unanswered_questions', 'question', `${marker} xxxx`))
  await attempt('A18', 'agente', 'Marcar una pregunta como resuelta', 'bloqueado', () => agent.from('unanswered_questions').update({ resolved: true }).eq('id', ctx.markerQuestionId).select(), questionUnchanged)
  await attempt('A19', 'agente', 'Cambiar el texto de una pregunta', 'bloqueado', () => agent.from('unanswered_questions').update({ question: 'manipulada' }).eq('id', ctx.markerQuestionId).select(), questionUnchanged)
  await attempt('A20', 'agente', 'Borrar una pregunta', 'bloqueado', () => agent.from('unanswered_questions').delete().eq('id', ctx.markerQuestionId).select(), questionUnchanged)

  // ---- Control positivo: la editora SÍ puede (demuestra que el arnés detecta "permitido")
  const edited = `${ctx.tempTitle} (editado por la editora)`
  await attempt('E1', 'editor', 'Editar el artículo con save_article (control positivo: debe poder)', 'permitido', () =>
    editor.rpc('save_article', { p_id: ctx.tempId, p_title: edited, p_category: ctx.tempCategory, p_last_reviewed_at: '2026-01-01', p_sections: ctx.tempSections.map((h) => ({ heading: h, body: 'Texto', steps: [] })) }),
  async () => {
    const t = await readTemp()
    return t?.title === edited ? { ok: true, note: 'el cambio de la editora SÍ se aplicó' } : { ok: false, note: 'el cambio de la editora no se aplicó' }
  })

  // ---------------------------------------------------------------- limpieza
  const leftovers: string[] = []
  const del = await editor.from('articles').delete().eq('id', ctx.tempId).select('id')
  if (del.error || !Array.isArray(del.data) || del.data.length === 0) leftovers.push(`artículo temporal ${ctx.tempId}`)
  const delQ = await editor.from('unanswered_questions').delete().ilike('question', `%${marker}%`).select('id')
  if (delQ.error) leftovers.push('preguntas temporales')
  const delA = await editor.from('articles').delete().ilike('title', `%${marker}%`).select('id')
  if (delA.error) leftovers.push('artículos con el marcador')
  const cleanup = leftovers.length === 0 ? 'Limpieza completa: no queda ningún dato temporal.' : `ATENCIÓN, revisa a mano: ${leftovers.join(', ')} (marcador ${marker}).`

  return { results, cleanup }
}

export function formatAttempts(results: AttemptResult[]): string {
  const lines: string[] = []
  for (const r of results) {
    lines.push(
      `${r.pass ? '✓' : '✗ FALLO'} ${r.id.padEnd(3)} [${r.actor}] ${r.action}`,
      `       esperado: ${r.expected} · API: ${r.response}`,
      `       comprobación en la base de datos: ${r.verification}`,
    )
  }
  const blocked = results.filter((r) => r.expected === 'bloqueado')
  const passed = results.filter((r) => r.pass).length
  lines.push(
    '',
    `Intentos de intrusión: ${blocked.length} · bloqueados correctamente: ${blocked.filter((r) => r.pass).length}`,
    `Comprobaciones totales (incluidos controles positivos): ${passed}/${results.length}`,
  )
  return lines.join('\n')
}
