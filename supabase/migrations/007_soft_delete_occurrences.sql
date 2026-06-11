-- Adiciona soft delete na tabela de ocorrências
alter table public.occurrences add column deleted_at timestamptz default null;

-- Recria as policies de select/update para excluir registros deletados
drop policy "Ocorrências visíveis a todos" on public.occurrences;
drop policy "Usuário edita própria ocorrência" on public.occurrences;

create policy "Ocorrências visíveis a todos" on public.occurrences
  for select using (deleted_at is null);

create policy "Usuário edita própria ocorrência" on public.occurrences
  for update using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);

-- Policy para soft delete (update de deleted_at)
create policy "Usuário deleta própria ocorrência" on public.occurrences
  for delete using (auth.uid() = user_id);

-- Atualiza a função search_nearby para ignorar deletados
create or replace function public.search_nearby(
  lat float, lng float, radius_m float
)
returns table (
  id uuid, user_id uuid, species_id uuid, condition text, stage text,
  notes text, photo_url text, verified boolean, created_at timestamptz,
  latitude float, longitude float, distance_m float
)
language sql stable as $$
  select
    o.id, o.user_id, o.species_id, o.condition, o.stage,
    o.notes, o.photo_url, o.verified, o.created_at,
    st_y(o.location::geometry) as latitude,
    st_x(o.location::geometry) as longitude,
    st_distance(o.location, st_point(lng, lat)::geography) as distance_m
  from public.occurrences o
  where st_dwithin(o.location, st_point(lng, lat)::geography, radius_m)
    and o.deleted_at is null
  order by distance_m asc;
$$;
