-- RS Monitor · esquema de base de datos para Supabase
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run.
-- Cada usuario ve y edita solo sus propios datos (Row Level Security).

create extension if not exists "pgcrypto";

-- ───────────────────────── Contactos (Base de relaciones) ─────────────────────────
create table if not exists public.contacts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Identificación y contacto
  full_name        text not null,
  phone            text,
  email            text,
  birthday         date,
  neighborhood     text,
  social           text,
  preferred_channel text,
  agent            text,
  source           text,          -- cómo llegó a vos
  referred_by      text,
  joined_on        date default current_date,

  -- La relación
  level            text check (level in ('A','B','C','D')),
  bond_type        text,
  contact_frequency text,
  relationship_status text,
  bond_quality     text,
  next_action      text,
  next_action_date date,
  next_action_reason text,
  related_people   text,
  do_not_contact   boolean not null default false,

  -- Información personal
  occupation       text,
  company          text,
  family_status    text,
  children         text,
  pets             text,
  football_team    text,
  hobbies          text,
  places           text,
  important_dates  text,
  values_notes     text,

  -- Oportunidad inmobiliaria
  opportunity_status text,
  operation_type   text,
  role             text,
  property_type    text,
  area_of_interest text,
  budget           text,
  timeframe        text,
  motivation       text,
  desire           text,
  need             text,
  possibility      text,
  urgency          text,
  probability      text,
  obstacles        text,
  has_property_to_sell boolean,
  needs_financing  boolean,
  other_deciders   text,
  competition      text,

  notes            text
);

create index if not exists contacts_user_idx on public.contacts (user_id);
create index if not exists contacts_next_action_idx on public.contacts (user_id, next_action_date);

-- ───────────────────────── Actividades (seguimiento + historial de contactos) ─────────────────────────
-- Tipos por categoría (color en la agenda):
--   negocio (verde):        contacto, reunion_cliente, prelisting, acm, captacion, visita, cierre, farming
--   administrativa (amarillo): admin, reunion (equipo / coach), otra
--   personal (rojo):        personal
create table if not exists public.activities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  date             date not null default current_date,
  time             time,          -- hora opcional (reuniones, visitas)
  done             boolean not null default true, -- false = pendiente / agendada
  type             text not null constraint activities_type_check check (type in (
                     'contacto','reunion_cliente','prelisting','acm','captacion','visita','cierre','farming',
                     'admin','reunion','otra','personal')),
  source           text,          -- origen del prelisting: circulo_a, ex_clientes, referidor, comprador, redes, guardia, farming, dueno_vende
  operation        text check (operation in ('venta','compra','alquiler')),
  contact_id       uuid references public.contacts (id) on delete set null,
  title            text not null,
  channel          text,
  result           text,
  conversation_status text,
  amount           numeric(14,2), -- comisión cobrada (solo cierres)
  next_action      text,
  next_action_date date,
  notes            text
);

create index if not exists activities_user_date_idx on public.activities (user_id, date);
create index if not exists activities_contact_idx on public.activities (contact_id);
create index if not exists activities_pending_idx on public.activities (user_id, date) where not done;

-- ───────────────────────── Objetivos anuales ─────────────────────────
create table if not exists public.goals (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year                   int not null,
  annual_target          numeric(14,2) not null default 0,   -- facturación bruta anual (USD)
  commission_per_deal    numeric(14,2) not null default 2000,
  sides_per_deal         numeric(6,2)  not null default 1,   -- puntas promedio
  monthly_rotation       numeric(6,4)  not null default 0.05,
  prelistings_per_listing numeric(6,2) not null default 4,
  contacts_per_deal      numeric(8,2)  not null default 14.91,
  working_weeks          int not null default 48,
  agent_split            numeric(5,4)  not null default 0.5, -- % neto que queda para la agente
  monthly_weights        numeric[] not null default array[0.0458,0.0507,0.0669,0.0683,0.0775,0.0686,0.0814,0.0924,0.1036,0.1052,0.1159,0.1237],
  updated_at             timestamptz not null default now(),
  unique (user_id, year)
);

-- ───────────────────────── Gastos e inversiones ─────────────────────────
create table if not exists public.expenses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year           int not null,
  name           text not null,
  monthly_amount numeric(14,2) not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists expenses_user_year_idx on public.expenses (user_id, year);

-- ───────────────────────── updated_at automático ─────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists contacts_touch on public.contacts;
create trigger contacts_touch before update on public.contacts
  for each row execute function public.touch_updated_at();
drop trigger if exists activities_touch on public.activities;
create trigger activities_touch before update on public.activities
  for each row execute function public.touch_updated_at();
drop trigger if exists goals_touch on public.goals;
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

-- ───────────────────────── Seguridad: cada usuario solo accede a lo suyo ─────────────────────────
alter table public.contacts   enable row level security;
alter table public.activities enable row level security;
alter table public.goals      enable row level security;
alter table public.expenses   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['contacts','activities','goals','expenses'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
