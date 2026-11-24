-- Solo si ya habías ejecutado schema.sql antes de este cambio:
-- vínculos entre contactos (pareja, hijos, amigos…) con enlace a la ficha.
alter table public.contacts add column if not exists related_contacts jsonb not null default '[]'::jsonb;
