-- Busca de espécies sem depender de acentuação.
--
-- Problema relatado pelos usuários: quem digita "guine", "acafrao" ou "ipe" não
-- encontra "Guiné", "Açafrão" ou "Ipê". Todas as buscas de espécie hoje são
-- `ilike '%termo%'` direto nas colunas `common_name`/`scientific_name`, e o
-- `ilike` só ignora maiúsculas/minúsculas — nunca os acentos. O efeito prático é
-- que a pessoa não acha a erva no autocomplete do registro (e conclui que ela não
-- existe no catálogo, sugerindo uma duplicata) nem ao filtrar registros próximos.
--
-- A normalização acontece aqui no banco, e não só no app, por dois motivos:
--   1. É preciso normalizar os *dois* lados da comparação. Normalizar só o termo
--      digitado não adianta: "guine" continua não casando com "Guiné" no banco.
--   2. Com colunas geradas + índice trigram, a comparação continua indexável;
--      aplicar `unaccent()` em cima da coluna a cada query jogaria fora o índice.
--
-- Guardar o texto normalizado em colunas `generated ... stored` mantém o
-- PostgREST funcionando (as telas de admin continuam filtrando com `.ilike`,
-- só que na coluna normalizada) e o Postgres se encarrega de manter os valores
-- em dia a cada insert/update, sem trigger.

-- ── Extensões ─────────────────────────────────────────────────────────────────
-- Nas imagens do Supabase as extensões vivem no schema `extensions`; num Postgres
-- cru, o default é `public`. Como `create extension if not exists` ignora o schema
-- quando a extensão já existe, escolhemos o destino só na primeira instalação.
do $$
declare
  _schema text := case
    when exists (select 1 from pg_namespace where nspname = 'extensions') then 'extensions'
    else 'public'
  end;
begin
  if not exists (select 1 from pg_extension where extname = 'unaccent') then
    execute format('create extension unaccent with schema %I', _schema);
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_trgm') then
    execute format('create extension pg_trgm with schema %I', _schema);
  end if;
end $$;

-- ── Normalização ──────────────────────────────────────────────────────────────
-- `unaccent(text)` é STABLE (resolve o dicionário via search_path), e coluna
-- gerada/índice exigem IMMUTABLE. Este wrapper é o truque padrão: fixa o
-- search_path para que a resolução do dicionário não dependa de quem chama, o
-- que torna o resultado de fato imutável e seguro para indexar.
create or replace function public.immutable_unaccent(p_text text)
returns text
language sql
immutable
parallel safe
strict
set search_path = public, extensions, pg_catalog
as $$ select unaccent(p_text) $$;

-- Forma canônica usada nos dois lados da busca: sem acento e em minúsculas.
-- O `unaccent` também resolve o cedilha (açafrão -> acafrao), que é justamente
-- um dos casos reclamados. Nulo vira '' para nunca "casar" com nada.
create or replace function public.normalize_search_text(p_text text)
returns text
language sql
immutable
parallel safe
as $$ select lower(public.immutable_unaccent(coalesce(p_text, ''))) $$;

-- ── Colunas normalizadas ──────────────────────────────────────────────────────
alter table public.species
  add column if not exists common_name_normalized text
    generated always as (public.normalize_search_text(common_name)) stored,
  add column if not exists scientific_name_normalized text
    generated always as (public.normalize_search_text(scientific_name)) stored;

comment on column public.species.common_name_normalized is
  'Nome popular sem acento e em minúsculas, mantido pelo Postgres. Alvo das buscas — não usar para exibição.';
comment on column public.species.scientific_name_normalized is
  'Nome científico sem acento e em minúsculas, mantido pelo Postgres. Alvo das buscas — não usar para exibição.';

-- Índices trigram: as buscas são todas `%termo%` (casa no meio da palavra, ex.:
-- "guine" em "erva-guiné"), padrão que um índice btree comum não atende.
create index if not exists species_common_name_normalized_trgm_idx
  on public.species using gin (common_name_normalized gin_trgm_ops);
create index if not exists species_scientific_name_normalized_trgm_idx
  on public.species using gin (scientific_name_normalized gin_trgm_ops);

-- ── Busca do autocomplete ─────────────────────────────────────────────────────
-- Vira RPC (antes era um `.or(...ilike...)` montado no app) por dois motivos além
-- da acentuação:
--   * Ordenação: o autocomplete corta em 20 resultados sem nenhum critério, então
--     a espécie mais óbvia podia simplesmente não aparecer. Aqui, quem começa com
--     o termo vem antes de quem só o contém.
--   * O termo digitado ia concatenado num filtro PostgREST, onde vírgula e
--     parêntese têm significado — buscar "erva (guiné)" quebrava a query. Como
--     parâmetro de RPC o texto é só texto; o que sobra é escapar os curingas de
--     LIKE (% e _) para que sejam tratados como caracteres literais.
--
-- SECURITY INVOKER (default): a RLS da migration 013 continua valendo, ou seja,
-- pendentes só aparecem para quem sugeriu e para admins.
create or replace function public.search_species(p_query text, p_limit int default 20)
returns setof public.species
language sql
stable
as $$
  with q as (
    select replace(replace(replace(
             btrim(public.normalize_search_text(p_query)),
             '\', '\\'), '%', '\%'), '_', '\_'
           ) as term
  )
  select s.*
  from public.species s, q
  where q.term <> ''
    and (
      s.common_name_normalized like '%' || q.term || '%'
      or s.scientific_name_normalized like '%' || q.term || '%'
    )
  order by
    case
      when s.common_name_normalized like q.term || '%' then 0
      when s.scientific_name_normalized like q.term || '%' then 1
      else 2
    end,
    s.common_name
  limit coalesce(p_limit, 20);
$$;

comment on function public.search_species(text, int) is
  'Busca espécies por nome popular ou científico ignorando acentos e maiúsculas, priorizando quem começa com o termo.';
