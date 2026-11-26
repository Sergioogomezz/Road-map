-- Pandilla · sincronización en tiempo real con Supabase (opcional)
-- Ejecuta este script en Supabase → SQL Editor. Después rellena
-- VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (ver .env.example) y vuelve a compilar.

create table if not exists public.trips (
  id          text primary key,
  code        text not null unique,
  data        jsonb not null,
  version     integer not null default 1,
  updated_at  timestamptz not null default now()
);

-- Seguridad: modelo sencillo "quien tiene el código entra", pensado para grupos de amigos.
-- Cualquiera con la clave pública (anon) de tu proyecto puede leer y escribir viajes.
-- Para un uso más abierto, añade Supabase Auth y restringe estas políticas.
alter table public.trips enable row level security;

drop policy if exists "trips_select" on public.trips;
drop policy if exists "trips_insert" on public.trips;
drop policy if exists "trips_update" on public.trips;

create policy "trips_select" on public.trips for select using (true);
create policy "trips_insert" on public.trips for insert with check (true);
create policy "trips_update" on public.trips for update using (true) with check (true);

-- Avisos en tiempo real cuando cambia un viaje.
alter publication supabase_realtime add table public.trips;
