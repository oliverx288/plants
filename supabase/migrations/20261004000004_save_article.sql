-- Faro · Guardado atómico de artículos (artículo + secciones en una sola transacción).
--
-- Crear o editar un artículo toca dos tablas. Hacerlo con varias peticiones desde el navegador
-- podría dejar un artículo a medias si algo falla en medio; una función se ejecuta entera o no
-- se ejecuta (si cualquier CHECK falla, se deshace todo).
--
-- SECURITY INVOKER: se ejecuta con los permisos de quien llama, así que las políticas de RLS
-- (solo el editor escribe) siguen siendo la barrera real. La comprobación explícita de
-- is_editor() es una segunda capa que además da un error claro.
--
--   p_id            null = crear; un uuid = editar ese artículo (se reemplazan todas sus secciones)
--   p_sections      array JSON ordenado: [{ "heading": "...", "body": "...", "steps": ["...", ...] }, ...]
-- Devuelve el id del artículo.
create function public.save_article(
  p_id               uuid,
  p_title            text,
  p_category         text,
  p_last_reviewed_at date,
  p_sections         jsonb
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer;
begin
  if not public.is_editor() then
    raise exception 'Solo el editor puede guardar artículos' using errcode = '42501';
  end if;

  -- Forma del JSON: se valida a mano para dar un error claro (los límites de longitud los
  -- aplican después los CHECK de las tablas).
  if p_sections is null or jsonb_typeof(p_sections) <> 'array' then
    raise exception 'p_sections debe ser un array' using errcode = '22023';
  end if;
  v_count := jsonb_array_length(p_sections);
  if v_count < 1 or v_count > 15 then
    raise exception 'Un artículo debe tener entre 1 y 15 secciones' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_sections) as e
    where jsonb_typeof(e) <> 'object'
       or jsonb_typeof(e -> 'heading') is distinct from 'string'
       or jsonb_typeof(coalesce(e -> 'body', '""'::jsonb)) <> 'string'
       or jsonb_typeof(coalesce(e -> 'steps', '[]'::jsonb)) <> 'array'
       or exists (
         select 1
         from jsonb_array_elements(coalesce(e -> 'steps', '[]'::jsonb)) as st
         where jsonb_typeof(st) <> 'string'
       )
  ) then
    raise exception 'Cada sección necesita heading (texto), body (texto) y steps (array de textos)'
      using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.articles (title, category, last_reviewed_at)
    values (btrim(p_title), btrim(p_category), coalesce(p_last_reviewed_at, current_date))
    returning id into v_id;
  else
    update public.articles
       set title = btrim(p_title),
           category = btrim(p_category),
           last_reviewed_at = coalesce(p_last_reviewed_at, last_reviewed_at)
     where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Artículo no encontrado' using errcode = 'P0002';
    end if;
    delete from public.article_sections where article_id = v_id;
  end if;

  insert into public.article_sections (article_id, position, heading, body, steps)
  select
    v_id,
    (t.ord - 1)::integer,
    btrim(t.e ->> 'heading'),
    btrim(coalesce(t.e ->> 'body', '')),
    coalesce(
      array(
        select btrim(s.step)
        from jsonb_array_elements_text(coalesce(t.e -> 'steps', '[]'::jsonb)) with ordinality as s(step, n)
        order by s.n
      ),
      '{}'
    )
  from jsonb_array_elements(p_sections) with ordinality as t(e, ord);

  return v_id;
end;
$$;

revoke execute on function public.save_article(uuid, text, text, date, jsonb) from public, anon;
grant execute on function public.save_article(uuid, text, text, date, jsonb) to authenticated;
