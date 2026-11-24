-- Solo si ya habías ejecutado schema.sql antes de este cambio:
-- etiquetas, redes por separado (Instagram, Facebook, LinkedIn) y varias oportunidades por contacto.
alter table public.contacts add column if not exists tags jsonb not null default '[]'::jsonb;
alter table public.contacts add column if not exists instagram text;
alter table public.contacts add column if not exists facebook text;
alter table public.contacts add column if not exists linkedin text;
alter table public.contacts add column if not exists related_contacts jsonb not null default '[]'::jsonb;

create table if not exists public.opportunities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  contact_id       uuid not null references public.contacts (id) on delete cascade,
  title            text not null,
  status           text,
  operation_type   text,
  role             text,
  property_type    text,
  area_of_interest text,
  budget           text,
  timeframe        text,
  urgency          text,
  probability      text,
  notes            text
);
create index if not exists opportunities_contact_idx on public.opportunities (contact_id);

drop trigger if exists opportunities_touch on public.opportunities;
create trigger opportunities_touch before update on public.opportunities
  for each row execute function public.touch_updated_at();

alter table public.opportunities enable row level security;
drop policy if exists "own rows" on public.opportunities;
create policy "own rows" on public.opportunities for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
