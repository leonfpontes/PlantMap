-- Fecha a escrita na spatial_ref_sys, exposta pela API desde sempre.
--
-- `spatial_ref_sys` é a tabela de sistema do PostGIS com as ~8.500 definições de
-- sistemas de coordenadas (EPSG). Ela nasce no schema `public` junto da extensão
-- (migration 001), e o setup padrão do Supabase dá `all privileges` no schema
-- public para `anon` e `authenticated`. Resultado, confirmado na API de produção:
-- um PATCH autenticado apenas com a anon key (que é pública, vai no bundle do
-- browser) é aceito com 204. Não é dado de usuário — é catálogo público de EPSG,
-- igual em qualquer instalação de PostGIS — mas apagar a linha do SRID 4326
-- quebra conversão de coordenada, e um TRUNCATE levaria as 8.500 de uma vez.
--
-- A correção NÃO pode ser revogar tudo: as operações de geography que o mapa usa
-- leem essa tabela por dentro. Um `st_dwithin` executado como `anon` dispara
-- literalmente
--     select proj4text, auth_name, auth_srid, srtext from public.spatial_ref_sys
--       where srid = 4326 limit 1
-- e, sem o select, a busca por proximidade morre com "permission denied" para
-- todo visitante não logado. Então: leitura fica, escrita sai.
--
-- Há dois caminhos para tirar a escrita, e qual deles funciona depende de quem
-- roda esta migration:
--
--   1. REVOKE + RLS. É a correção limpa, e a única que silencia o alerta do
--      painel do Supabase. Exige ser dono da tabela — vale no stack local (roda
--      como superusuário), não vale no Supabase gerenciado, onde a tabela
--      pertence a `supabase_admin` e o papel das migrations (`postgres`) leva
--      "42501: must be owner of table spatial_ref_sys". Pior: o REVOKE ali não
--      falha, ele simplesmente não faz nada — quem concedeu foi supabase_admin.
--
--   2. Gatilho de guarda, que só exige o privilégio TRIGGER (que `postgres` tem).
--      Rejeita escrita vinda de `anon` e `authenticated` e é o que de fato
--      protege a instância gerenciada. Não mexe em privilégio nem em RLS, então
--      o alerta do painel continua aceso: silenciá-lo depende do suporte do
--      Supabase revogar os grants ou mover o PostGIS para o schema `extensions`.
--
-- Aplica os dois: o gatilho sempre (é a garantia que funciona em qualquer
-- instância), o revoke/RLS quando o papel puder. `service_role` e `postgres`
-- seguem livres — é por eles que passaria uma manutenção legítima de SRIDs.

-- ── Gatilho de guarda ─────────────────────────────────────────────────────────
create or replace function public.block_spatial_ref_sys_writes()
returns trigger
language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    raise exception 'spatial_ref_sys é somente leitura para a API'
      using errcode = '42501';
  end if;
  -- DELETE traz new nulo; qualquer outro papel segue normalmente.
  return coalesce(new, old);
end;
$$;

comment on function public.block_spatial_ref_sys_writes() is
  'Impede que os papéis da API (anon/authenticated) escrevam na tabela de SRIDs do PostGIS. Ver migration 028.';

drop trigger if exists block_spatial_ref_sys_writes on public.spatial_ref_sys;
create trigger block_spatial_ref_sys_writes
  before insert or update or delete on public.spatial_ref_sys
  for each row execute function public.block_spatial_ref_sys_writes();

-- TRUNCATE não dispara gatilho de linha; precisa do seu próprio, por statement.
drop trigger if exists block_spatial_ref_sys_truncate on public.spatial_ref_sys;
create trigger block_spatial_ref_sys_truncate
  before truncate on public.spatial_ref_sys
  for each statement execute function public.block_spatial_ref_sys_writes();

-- ── Correção limpa, quando o papel for dono da tabela ─────────────────────────
do $$
declare
  _role text;
begin
  foreach _role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = _role) then
      execute format(
        'revoke insert, update, delete, truncate, references, trigger on public.spatial_ref_sys from %I',
        _role
      );
    end if;
  end loop;

  alter table public.spatial_ref_sys enable row level security;

  -- Policy permissiva de leitura: sem ela, a RLS derrubaria a consulta interna
  -- do PostGIS descrita no cabeçalho e o mapa pararia para quem não está logado.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'spatial_ref_sys'
      and policyname = 'Catálogo de SRIDs é público para leitura'
  ) then
    create policy "Catálogo de SRIDs é público para leitura"
      on public.spatial_ref_sys for select using (true);
  end if;
exception when insufficient_privilege then
  raise notice 'Sem posse de public.spatial_ref_sys: a escrita fica barrada só pelo gatilho, e o alerta de RLS do painel segue aceso.';
end $$;
