-- Faro · search_knowledge tolera erratas ("baterai" → "batería", "bateira" → "batería").
--
-- Una palabra de la pregunta que NO existe en la base de conocimiento se sustituye por la palabra del vocabulario
-- más parecida, si hay una sola candidata a esa distancia. Se compara la raíz (ya sin tilde ni terminación) con la
-- distancia de Levenshtein:
--   · raíces de menos de 6 letras: nunca se corrigen. Medido: "quiero" (raíz "quier") se convertía en "querer" y
--     "cuesta" ("cuest") en "cuenta", y eso volvía a inventar respuestas;
--   · 1 error (letra de más, de menos o cambiada) o 1 transposición ("bateira"); nunca 2 errores cualesquiera:
--     "pulsera" no debe convertirse en "pulsar", que es otra palabra;
--   · la primera letra debe coincidir (las erratas casi nunca la cambian) y, si dos palabras empatan en
--     distancia, no se corrige: mejor no entender que entender mal.
-- Una palabra que sí existe NUNCA se toca. El resto del cálculo (score, matched_weight…) no cambia.

create extension if not exists fuzzystrmatch with schema extensions;

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
  with secs as (
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
  q_raw as (
    select distinct lexeme
    from unnest(tsvector_to_array(
      to_tsvector('public.spanish_unaccent', left(coalesce(query_text, ''), 300))
    )) as lexeme
  ),
  -- Para cada palabra de la pregunta: ella misma si existe; si no, la candidata única más cercana (o ella misma).
  q as (
    select distinct coalesce(fix.lexeme, q_raw.lexeme) as lexeme
    from q_raw
    left join lateral (
      with cand as (
        select d.lexeme, extensions.levenshtein(d.lexeme, q_raw.lexeme) as dist
        from df d
        where length(q_raw.lexeme) >= 6
          and left(d.lexeme, 1) = left(q_raw.lexeme, 1)
          and abs(length(d.lexeme) - length(q_raw.lexeme)) <= 2
          and not exists (select 1 from df e where e.lexeme = q_raw.lexeme)
      ),
      best as (
        select * from cand
        where dist = (select min(dist) from cand)
          and (
            dist <= 1
            -- 2 errores solo si es una transposición (mismas letras, otro orden): "bateira" → "bateri".
            or (dist = 2 and length(lexeme) = length(q_raw.lexeme)
                and (select string_agg(c, '' order by c) from regexp_split_to_table(lexeme, '') c)
                  = (select string_agg(c, '' order by c) from regexp_split_to_table(q_raw.lexeme, '') c))
          )
      )
      -- Solo si hay UNA candidata a la distancia mínima.
      select min(lexeme) as lexeme from best having count(*) = 1
    ) fix on true
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
