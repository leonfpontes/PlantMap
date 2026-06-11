-- Habilitar extensão geoespacial
create extension if not exists postgis;

-- Tabela de perfis (espelha auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Tabela de espécies
create table public.species (
  id uuid default gen_random_uuid() primary key,
  scientific_name text not null,
  common_name text not null,
  family text,
  origin text check (origin in ('native','exotic','naturalized')) default 'native',
  description text,
  image_url text,
  created_at timestamptz default now()
);

-- Tabela de ocorrências com coluna geoespacial
create table public.occurrences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  species_id uuid references public.species(id) not null,
  location geography(Point, 4326) not null,
  condition text check (condition in ('healthy','fair','poor','dead')) default 'healthy',
  stage text check (stage in ('seedling','juvenile','adult','unknown')) default 'adult',
  notes text,
  photo_url text,
  verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índice espacial para buscas por raio
create index occurrences_location_idx on public.occurrences using gist(location);

-- Tabela de favoritos
create table public.favorites (
  user_id uuid references public.profiles(id) on delete cascade,
  occurrence_id uuid references public.occurrences(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, occurrence_id)
);

-- Função para buscar ocorrências dentro de um raio (em metros)
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
  order by distance_m asc;
$$;

-- RLS (Row Level Security)
alter table public.profiles enable row level security;
alter table public.occurrences enable row level security;
alter table public.favorites enable row level security;

create policy "Perfis visíveis a todos" on public.profiles for select using (true);
create policy "Usuário edita próprio perfil" on public.profiles for update using (auth.uid() = id);

create policy "Ocorrências visíveis a todos" on public.occurrences for select using (true);
create policy "Usuário registra ocorrência" on public.occurrences for insert with check (auth.uid() = user_id);
create policy "Usuário edita própria ocorrência" on public.occurrences for update using (auth.uid() = user_id);

create policy "Favoritos visíveis ao dono" on public.favorites for select using (auth.uid() = user_id);
create policy "Usuário gerencia favoritos" on public.favorites for all using (auth.uid() = user_id);

-- Trigger para criar perfil automaticamente ao registrar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id, new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dados de exemplo para espécies
insert into public.species (scientific_name, common_name, family, origin, description) values
  ('Handroanthus impetiginosus', 'Ipê-roxo', 'Bignoniaceae', 'native', 'Árvore símbolo do Brasil, floresce com flores roxas vistosas antes das folhas.'),
  ('Cecropia pachystachya', 'Embaúba', 'Urticaceae', 'native', 'Árvore pioneira de crescimento rápido, comum em áreas abertas e bordas de mata.'),
  ('Eugenia uniflora', 'Pitangueira', 'Myrtaceae', 'native', 'Arbusto ou árvore pequena que produz frutos vermelhos comestíveis.'),
  ('Mangifera indica', 'Mangueira', 'Anacardiaceae', 'exotic', 'Árvore frutífera de grande porte originária da Ásia.'),
  ('Tibouchina granulosa', 'Quaresmeira', 'Melastomataceae', 'native', 'Árvore ornamental com flores roxas intensas, típica do cerrado.'),
  ('Ficus benjamina', 'Figueira-benjamina', 'Moraceae', 'exotic', 'Espécie ornamental amplamente cultivada em praças e jardins.'),
  ('Tabebuia roseoalba', 'Ipê-branco', 'Bignoniaceae', 'native', 'Árvore de médio porte com flores brancas que surgem sem folhas.'),
  ('Paubrasilia echinata', 'Pau-brasil', 'Fabaceae', 'native', 'Árvore que deu nome ao Brasil, ameaçada de extinção.');
