-- Faro · Recuperación de fragmentos para el asistente (sin LLM) y registro de preguntas sin respuesta.

-- ---------------------------------------------------------------------------
-- Búsqueda de texto en español que ignora los acentos
-- ---------------------------------------------------------------------------
create extension if not exists unaccent with schema extensions;

create text search configuration public.spanish_unaccent (copy = pg_catalog.spanish);
alter text search configuration public.spanish_unaccent
  alter mapping for hword, hword_part, word
  with extensions.unaccent, pg_catalog.spanish_stem;

-- ---------------------------------------------------------------------------
-- search_knowledge: devuelve los fragmentos (secciones) más relevantes para una pregunta.
--
-- Cada término de la pregunta (ya sin acentos, sin palabras vacías y en su raíz) pesa según su
-- IDF, es decir, su rareza en la base de conocimiento:
--   · los términos muy comunes del dominio ("reloj", "app") pesan poco;
--   · los que no aparecen en ningún artículo ("precio", "garantía") pesan mucho, y como no
--     casan con nada bajan la puntuación: así se detectan las preguntas sin respuesta.
-- Además importa DÓNDE casa cada término: título del artículo (x1.0), encabezado de la
-- sección (x0.8) y cuerpo o pasos (x0.6). El título es el problema en sí; una coincidencia
-- casual en un paso es una señal más débil.
--
--   score          = peso de lo que casó / peso de todos los términos de la pregunta  (0 a 1)
--   matched_weight = peso absoluto de lo que casó (evita dar por buena una consulta con poca
--                    información, como la palabra "reloj" a secas, que casa con todo)
--
-- SECURITY INVOKER: se ejecuta con los permisos de quien llama, así que RLS sigue aplicando
-- (un usuario sin perfil de soporte no obtiene nada). La pregunta nunca se concatena en SQL
-- dinámico: se trata como datos, de modo que operadores como & | ! o comillas no tienen efecto.
-- El umbral de "No tengo información" lo decide la aplicación (src/assistant/relevance.ts).
-- Devuelve la mejor sección de cada artículo, ordenadas de más a menos relevantes.
-- ---------------------------------------------------------------------------
create function public.search_knowledge(query_text text, max_results integer default 3)
returns table (
  article_id       uuid,
  article_title    text,
  category         text,
  section_id       uuid,
  section_position integer,
  heading          text,
  body             text,
  steps            text[],
  score            double precision,
  matched_weight   double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select distinct lexeme
    from unnest(tsvector_to_array(
      to_tsvector('public.spanish_unaccent', left(coalesce(query_text, ''), 300))
    )) as lexeme
  ),
  secs as (
    select
      s.id as section_id, s.article_id, s."position", s.heading, s.body, s.steps,
      a.title, a.category,
      setweight(to_tsvector('public.spanish_unaccent', a.title), 'A')
        || setweight(to_tsvector('public.spanish_unaccent', s.heading), 'B')
        || setweight(to_tsvector('public.spanish_unaccent', s.body), 'C')
        || setweight(to_tsvector('public.spanish_unaccent', array_to_string(s.steps, ' ')), 'D') as vec
    from public.article_sections s
    join public.articles a on a.id = s.article_id
  ),
  -- Para cada sección y término, el factor del mejor campo en el que aparece.
  sec_terms as (
    select
      secs.section_id, t.lexeme,
      max(case w when 'A' then 1.0 when 'B' then 0.8 else 0.6 end) as factor
    from secs,
         unnest(secs.vec) as t(lexeme, positions, weights),
         unnest(t.weights) as w
    group by secs.section_id, t.lexeme
  ),
  corpus as (select count(*)::double precision as n from secs),
  df as (
    select lexeme, count(*)::double precision as ndoc
    from sec_terms
    group by lexeme
  ),
  weights as (
    select q.lexeme, ln(1 + corpus.n / greatest(coalesce(df.ndoc, 0), 0.5)) as w
    from q
    cross join corpus
    left join df on df.lexeme = q.lexeme
  ),
  total as (select sum(w) as total_w from weights),
  matches as (
    select st.section_id, sum(w.w * st.factor) as matched_w
    from sec_terms st
    join weights w on w.lexeme = st.lexeme
    group by st.section_id
  ),
  scored as (
    select
      secs.article_id, secs.title, secs.category, secs.section_id, secs."position",
      secs.heading, secs.body, secs.steps,
      matches.matched_w / total.total_w as score,
      matches.matched_w
    from secs
    join matches on matches.section_id = secs.section_id
    cross join total
    where total.total_w > 0
  ),
  best_per_article as (
    select distinct on (article_id) *
    from scored
    order by article_id, score desc, (cardinality(steps) > 0) desc, "position"
  )
  select
    article_id, title, category, section_id, "position", heading, body, steps, score, matched_w
  from best_per_article
  order by score desc, (cardinality(steps) > 0) desc, "position"
  limit least(greatest(coalesce(max_results, 3), 1), 10);
$$;

-- ---------------------------------------------------------------------------
-- log_unanswered_question: registra una pregunta sin respuesta (sin duplicar).
-- SECURITY INVOKER: la política de RLS exige ser personal de soporte y user_id = auth.uid();
-- el CHECK de la tabla valida la longitud (3-300).
--
-- ON CONFLICT DO NOTHING va SIN objetivo de conflicto a propósito: con un objetivo
-- (user_id, question_normalized) Postgres exige además pasar la política de SELECT, y el agente
-- no puede leer esta tabla (solo el editor), así que fallaría por RLS. Sin objetivo se ignora
-- cualquier violación de unicidad, y la única relevante es el índice de deduplicación
-- (la otra es la clave primaria, un uuid aleatorio). Se evita así un SECURITY DEFINER,
-- que se saltaría RLS y obligaría a repetir a mano las comprobaciones de rol.
-- ---------------------------------------------------------------------------
create function public.log_unanswered_question(question_text text)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  insert into public.unanswered_questions (question)
  values (btrim(question_text))
  on conflict do nothing;
$$;

-- Solo usuarios autenticados pueden llamarlas.
revoke execute on function public.search_knowledge(text, integer) from public, anon;
revoke execute on function public.log_unanswered_question(text) from public, anon;
grant execute on function public.search_knowledge(text, integer) to authenticated;
grant execute on function public.log_unanswered_question(text) to authenticated;
