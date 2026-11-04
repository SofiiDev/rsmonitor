-- Solo si ya habías ejecutado schema.sql antes de este cambio:
-- campos "¿Es padre/madre?", "¿Tiene mascotas?" y fechas de familiares.
alter table public.contacts add column if not exists is_parent boolean;
alter table public.contacts add column if not exists has_pets boolean;
alter table public.contacts add column if not exists family_dates jsonb not null default '[]'::jsonb;
