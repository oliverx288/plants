-- Faro · Valoración de las respuestas del asistente ("¿Te sirvió?").
-- Sirve para medir la fiabilidad con uso real, no solo con preguntas escritas por quien hizo el sistema.

create table public.answer_feedback (
  id                  uuid primary key default gen_random_uuid(),
  -- El usuario lo fija el servidor (auth.uid()): nadie puede valorar "a nombre de" otra persona.
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question            text not null check (char_length(btrim(question)) between 3 and 300),
  -- Misma normalización que unanswered_questions: la misma pregunta con otras mayúsculas o espacios es la misma.
  question_normalized text generated always as (
                        lower(regexp_replace(btrim(question), '\s+', ' ', 'g'))
                      ) stored,
  -- Si el artículo se borra, la valoración se conserva (con el título tal como era).
  article_id          uuid references public.articles (id) on delete set null,
  article_title       text not null check (char_length(btrim(article_title)) between 1 and 200),
  helpful             boolean not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Una valoración por persona, pregunta y artículo: si cambia de opinión, se actualiza.
-- (Con ON DELETE SET NULL, article_id puede ser null: los nulos no chocan entre sí en un índice único.)
create unique index answer_feedback_one_per_user_idx
  on public.answer_feedback (user_id, question_normalized, article_id);

create index answer_feedback_helpful_idx on public.answer_feedback (helpful, created_at desc);

create trigger answer_feedback_set_updated_at
  before update on public.answer_feedback
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS y privilegios mínimos
-- ---------------------------------------------------------------------------
alter table public.answer_feedback enable row level security;

revoke all on public.answer_feedback from anon, authenticated;
grant select, insert, delete on public.answer_feedback to authenticated;
-- Al actualizar solo se puede cambiar el sentido de la valoración, nunca la pregunta, el artículo ni el autor.
grant update (helpful) on public.answer_feedback to authenticated;

create policy "answer_feedback: el personal valora a su nombre"
  on public.answer_feedback for insert to authenticated
  with check ((select public.is_staff()) and user_id = (select auth.uid()));

create policy "answer_feedback: cada persona ve las suyas; el editor ve todas"
  on public.answer_feedback for select to authenticated
  using ((select public.is_staff()) and (user_id = (select auth.uid()) or (select public.is_editor())));

create policy "answer_feedback: cada persona cambia las suyas"
  on public.answer_feedback for update to authenticated
  using ((select public.is_staff()) and user_id = (select auth.uid()))
  with check ((select public.is_staff()) and user_id = (select auth.uid()));

create policy "answer_feedback: solo el editor borra"
  on public.answer_feedback for delete to authenticated
  using ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- submit_answer_feedback: guarda o actualiza la valoración.
-- SECURITY INVOKER: RLS sigue aplicando. El título del artículo lo pone la base de datos a partir de su id,
-- así el cliente no puede inventar a qué artículo se refiere la valoración.
-- ---------------------------------------------------------------------------
create function public.submit_answer_feedback(p_question text, p_article_id uuid, p_helpful boolean)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  insert into public.answer_feedback (question, article_id, article_title, helpful)
  select btrim(p_question), a.id, a.title, p_helpful
  from public.articles a
  where a.id = p_article_id
  on conflict (user_id, question_normalized, article_id) do update set helpful = excluded.helpful;

  if not found then
    raise exception 'Artículo no encontrado' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.submit_answer_feedback(text, uuid, boolean) from public, anon;
grant execute on function public.submit_answer_feedback(text, uuid, boolean) to authenticated;
