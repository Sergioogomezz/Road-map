-- Pandilla · sincronización en tiempo real con Supabase
-- Pégalo entero en Supabase → SQL Editor → Run. Se puede ejecutar varias veces sin problema.

-- 1. Viajes ------------------------------------------------------------------
create table if not exists public.trips (
  id          text primary key,
  code        text not null unique,
  data        jsonb not null,
  version     integer not null default 1,
  updated_at  timestamptz not null default now()
);

-- Seguridad: modelo "quien tiene el código entra", pensado para grupos de amigos.
-- Cualquiera con la clave pública de tu proyecto puede leer y escribir viajes.
alter table public.trips enable row level security;
grant select, insert, update on public.trips to anon, authenticated;

drop policy if exists "trips_select" on public.trips;
drop policy if exists "trips_insert" on public.trips;
drop policy if exists "trips_update" on public.trips;
create policy "trips_select" on public.trips for select to anon, authenticated using (true);
create policy "trips_insert" on public.trips for insert to anon, authenticated with check (true);
create policy "trips_update" on public.trips for update to anon, authenticated using (true) with check (true);

-- 2. Avisos en tiempo real ---------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.trips;
exception when duplicate_object then null;
end $$;

-- 3. Fotos y PDFs de la bóveda -----------------------------------------------
insert into storage.buckets (id, name, public)
values ('pandilla', 'pandilla', false)
on conflict (id) do nothing;

drop policy if exists "pandilla_files_select" on storage.objects;
drop policy if exists "pandilla_files_insert" on storage.objects;
drop policy if exists "pandilla_files_update" on storage.objects;
drop policy if exists "pandilla_files_delete" on storage.objects;
create policy "pandilla_files_select" on storage.objects for select to anon, authenticated using (bucket_id = 'pandilla');
create policy "pandilla_files_insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'pandilla');
create policy "pandilla_files_update" on storage.objects for update to anon, authenticated using (bucket_id = 'pandilla') with check (bucket_id = 'pandilla');
create policy "pandilla_files_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'pandilla');
