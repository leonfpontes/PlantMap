-- Busca sem limite de raio.
--
-- Até aqui `search_nearby` sempre exigia um raio, e as telas usavam raios fixos
-- (50km no máximo em /search, 100km no mapa). O efeito prático é que quem viaja
-- para longe da própria cidade abre o app e não vê mais nada: as ocorrências
-- continuam lá, só ficam fora do raio. Agora `radius_m` nulo (ou <= 0) significa
-- "sem limite" — a busca varre o mundo todo e devolve tudo ordenado por
-- distância, do mais perto para o mais longe.
--
-- Como sem raio o resultado pode crescer sem teto, entra também `max_results`:
-- como a ordenação é por distância, cortar no N devolve sempre as N ocorrências
-- mais próximas de quem está buscando. Nulo = sem corte (LIMIT NULL no Postgres
-- é justamente "sem limite"), que é o caso das buscas com raio definido.
--
-- A regra de privacidade da migration 019 (aproximação de ~500m para quem não
-- optou por compartilhar localização exata) continua idêntica.

-- Assinatura muda (dois parâmetros novos), então o create or replace não basta.
drop function if exists public.search_nearby(float, float, float);

create or replace function public.search_nearby(
  lat float, lng float, radius_m float default null, max_results int default null
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
    case
      when p.share_exact_location
        or o.user_id = auth.uid()
        or exists (select 1 from public.profiles a where a.id = auth.uid() and a.is_admin)
        then st_y(o.location::geometry)
      else round((st_y(o.location::geometry) / 0.0045)::numeric) * 0.0045
    end as latitude,
    case
      when p.share_exact_location
        or o.user_id = auth.uid()
        or exists (select 1 from public.profiles a where a.id = auth.uid() and a.is_admin)
        then st_x(o.location::geometry)
      else round((st_x(o.location::geometry) / 0.0045)::numeric) * 0.0045
    end as longitude,
    st_distance(o.location, st_point(lng, lat)::geography) as distance_m
  from public.occurrences o
  join public.profiles p on p.id = o.user_id
  where (
      radius_m is null
      or radius_m <= 0
      or st_dwithin(o.location, st_point(lng, lat)::geography, radius_m)
    )
    and o.deleted_at is null
  order by distance_m asc
  limit max_results;
$$;
