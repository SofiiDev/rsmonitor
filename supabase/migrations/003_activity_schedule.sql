-- Solo si ya habías ejecutado schema.sql antes de este cambio:
-- agrega hora y estado (pendiente / hecha) a las actividades, para la lista "Para hacer hoy".
alter table public.activities add column if not exists time time;
alter table public.activities add column if not exists done boolean not null default true;
create index if not exists activities_pending_idx on public.activities (user_id, date) where not done;
