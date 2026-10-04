-- Faro · Seguridad a nivel de fila (RLS) y privilegios
-- Principio: el frontend solo muestra u oculta; aquí se decide quién puede qué.

-- ---------------------------------------------------------------------------
-- Funciones auxiliares de rol
-- SECURITY DEFINER: leen 'profiles' saltándose su RLS (si no, la política de
-- 'profiles' se llamaría a sí misma en bucle). Por eso fijan search_path vacío
-- y califican todo: evita ataques por sustitución de objetos en el search_path.
-- ---------------------------------------------------------------------------
create function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

-- ¿Es personal de soporte (agente o editor)? Un usuario de Auth sin perfil NO lo es.
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() in ('agent', 'editor'), false);
$$;

create function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'editor', false);
$$;

-- Solo usuarios autenticados pueden ejecutarlas.
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_editor() from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_editor() to authenticated;

-- ---------------------------------------------------------------------------
-- Activar RLS en TODAS las tablas
-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.articles             enable row level security;
alter table public.article_sections     enable row level security;
alter table public.unanswered_questions enable row level security;

-- ---------------------------------------------------------------------------
-- Privilegios mínimos (segunda barrera, además de las políticas)
-- Se parte de cero: ni 'anon' ni 'authenticated' tienen nada y se concede lo justo.
-- ---------------------------------------------------------------------------
revoke all on public.profiles             from anon, authenticated;
revoke all on public.articles             from anon, authenticated;
revoke all on public.article_sections     from anon, authenticated;
revoke all on public.unanswered_questions from anon, authenticated;

grant select on public.profiles to authenticated;                       -- sin insert/update/delete: los roles no se tocan desde la API
grant select, insert, update, delete on public.articles         to authenticated;
grant select, insert, update, delete on public.article_sections to authenticated;
grant select, insert, delete on public.unanswered_questions     to authenticated;
-- Del update de preguntas solo se permite cambiar el estado, nunca el texto ni el autor.
grant update (resolved, resolved_at) on public.unanswered_questions to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles: cada usuario ve el suyo; el editor ve todos"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_editor()));

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------
create policy "articles: el personal de soporte puede leer"
  on public.articles for select to authenticated
  using ((select public.is_staff()));

create policy "articles: solo el editor inserta"
  on public.articles for insert to authenticated
  with check ((select public.is_editor()));

create policy "articles: solo el editor modifica"
  on public.articles for update to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

create policy "articles: solo el editor borra"
  on public.articles for delete to authenticated
  using ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- article_sections
-- ---------------------------------------------------------------------------
create policy "article_sections: el personal de soporte puede leer"
  on public.article_sections for select to authenticated
  using ((select public.is_staff()));

create policy "article_sections: solo el editor inserta"
  on public.article_sections for insert to authenticated
  with check ((select public.is_editor()));

create policy "article_sections: solo el editor modifica"
  on public.article_sections for update to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

create policy "article_sections: solo el editor borra"
  on public.article_sections for delete to authenticated
  using ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- unanswered_questions
-- Agente y editor pueden registrar SU pregunta; solo el editor puede verlas.
-- ---------------------------------------------------------------------------
create policy "unanswered_questions: el personal registra la suya"
  on public.unanswered_questions for insert to authenticated
  with check ((select public.is_staff()) and user_id = (select auth.uid()));

create policy "unanswered_questions: solo el editor lee"
  on public.unanswered_questions for select to authenticated
  using ((select public.is_editor()));

create policy "unanswered_questions: solo el editor las marca como resueltas"
  on public.unanswered_questions for update to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

create policy "unanswered_questions: solo el editor las borra"
  on public.unanswered_questions for delete to authenticated
  using ((select public.is_editor()));
