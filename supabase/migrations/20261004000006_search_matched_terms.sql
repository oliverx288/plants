-- Faro · search_knowledge devuelve también cuántos términos de la pregunta coinciden y cuántos tiene.
--
-- Motivo: una consulta corta y precisa ("el reloj no carga") coincide al 100 % con el título de un artículo pero
-- suma poca evidencia absoluta (pocas palabras), y el umbral de evidencia la rechazaba. Con estos dos números la
-- aplicación puede aceptar una "coincidencia completa" (todas las palabras significativas, al menos dos, sin
-- empate con otro artículo) sin ablandar el umbral general. Ver src/assistant/relevance.ts.
--
-- Cambiar las columnas de salida de una función obliga a borrarla y volver a crearla (y a repetir sus permisos).
-- El cálculo de score y matched_weight no cambia.

drop function public.search_knowledge(text, integer);

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
  matched_weight   double precision,
  matched_terms    integer,
  query_terms      integer
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
  total as (select sum(w) as total_w, count(*)::integer as n_terms from weights),
  matches as (
    select st.section_id, sum(w.w * st.factor) as matched_w, count(*)::integer as matched_n
    from sec_terms st
    join weights w on w.lexeme = st.lexeme
    group by st.section_id
  ),
  scored as (
    select
      secs.article_id, secs.title, secs.category, secs.section_id, secs."position",
      secs.heading, secs.body, secs.steps,
      matches.matched_w / total.total_w as score,
      matches.matched_w,
      matches.matched_n,
      total.n_terms
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
    article_id, title, category, section_id, "position", heading, body, steps, score, matched_w, matched_n, n_terms
  from best_per_article
  order by score desc, (cardinality(steps) > 0) desc, "position"
  limit least(greatest(coalesce(max_results, 3), 1), 10);
$$;

revoke execute on function public.search_knowledge(text, integer) from public, anon;
grant execute on function public.search_knowledge(text, integer) to authenticated;
