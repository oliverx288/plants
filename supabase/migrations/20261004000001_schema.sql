-- Faro · Esquema de base de datos
-- Las restricciones CHECK son la validación "de verdad": se aplican aunque alguien
-- se salte el frontend y hable directamente con la API de Supabase.

-- ---------------------------------------------------------------------------
-- profiles: rol de cada usuario (1 fila por usuario de auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('agent', 'editor')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- articles: artículos de la base de conocimiento
-- ---------------------------------------------------------------------------
create table public.articles (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(btrim(title)) between 5 and 120),
  category         text not null check (char_length(btrim(category)) between 2 and 60),
  last_reviewed_at date not null default current_date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Valida los pasos de una sección: sin elementos nulos/vacíos y máximo 300 caracteres cada uno.
create function public.steps_are_valid(steps text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not exists (
    select 1
    from unnest(steps) as s
    where s is null or char_length(btrim(s)) not between 1 and 300
  );
$$;

-- ---------------------------------------------------------------------------
-- article_sections: fragmentos de un artículo (unidad de recuperación del asistente)
-- ---------------------------------------------------------------------------
create table public.article_sections (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  position   integer not null check (position >= 0),
  heading    text not null check (char_length(btrim(heading)) between 1 and 120),
  body       text not null default '' check (char_length(body) <= 2000),
  steps      text[] not null default '{}'
             check (cardinality(steps) <= 20 and public.steps_are_valid(steps)),
  -- Una sección debe tener texto o pasos (no puede estar vacía).
  check (char_length(btrim(body)) > 0 or cardinality(steps) > 0),
  -- Deferrable: permite reordenar secciones dentro de una transacción.
  constraint article_sections_position_unique
    unique (article_id, position) deferrable initially deferred
);

create index article_sections_article_id_idx on public.article_sections (article_id);

-- ---------------------------------------------------------------------------
-- unanswered_questions: preguntas a las que el asistente no supo responder
-- ---------------------------------------------------------------------------
create table public.unanswered_questions (
  id                  uuid primary key default gen_random_uuid(),
  question            text not null check (char_length(btrim(question)) between 3 and 300),
  -- Versión normalizada (minúsculas, espacios colapsados) para detectar duplicados.
  question_normalized text generated always as (
                        lower(regexp_replace(btrim(question), '\s+', ' ', 'g'))
                      ) stored,
  -- El usuario lo fija el servidor (auth.uid()), el cliente no puede suplantar a otro.
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at          timestamptz not null default now(),
  resolved            boolean not null default false,
  resolved_at         timestamptz
);

-- No se repite la misma pregunta pendiente del mismo usuario.
create unique index unanswered_questions_dedupe_idx
  on public.unanswered_questions (user_id, question_normalized)
  where not resolved;

create index unanswered_questions_pending_idx
  on public.unanswered_questions (created_at desc)
  where not resolved;

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();
