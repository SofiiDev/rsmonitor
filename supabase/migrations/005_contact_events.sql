-- Solo si ya habías ejecutado schema.sql antes de este cambio:
-- historial automático de cada contacto (recontactos, cambios de nivel, etc.).
create table if not exists public.contact_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  contact_id  uuid not null references public.contacts (id) on delete cascade,
  kind        text not null,
  detail      text
);

create index if not exists contact_events_contact_idx on public.contact_events (contact_id, created_at desc);

alter table public.contact_events enable row level security;
drop policy if exists "own rows" on public.contact_events;
create policy "own rows" on public.contact_events for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
