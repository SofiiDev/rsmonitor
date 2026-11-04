-- Solo si ya habías ejecutado schema.sql antes de este cambio:
-- habilita los tipos "reunion_cliente" (negocio), "admin" (administrativa) y "personal".
alter table public.activities drop constraint if exists activities_type_check;
alter table public.activities add constraint activities_type_check check (type in (
  'contacto','reunion_cliente','prelisting','acm','captacion','visita','cierre','farming',
  'admin','reunion','otra','personal'));
