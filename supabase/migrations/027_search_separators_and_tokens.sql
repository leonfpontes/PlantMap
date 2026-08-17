-- Busca que não tropeça em hífen, barra ou ordem das palavras.
--
-- A migration 025 resolveu acentuação, mas sobrou um caso igualmente comum:
-- quem digita "espada de sao jorge" não acha "Espada-de-Iansã / Espada-de-São-
-- Jorge", porque a comparação é `like '%termo%'` e o hífen do catálogo não
-- existe no que a pessoa digitou. O mesmo vale para "hortela pimenta"
-- (catálogo: "Hortelã-pimenta") e para nomes com barra, que no catálogo separam
-- sinônimos ("Alfavaca / Alfavaquinha").
--
-- Duas mudanças, então:
--
--   1. Separador vira espaço. Hífen, barra, apóstrofo, parêntese e pontuação em
--      geral deixam de ser barreira: os dois lados da comparação viram uma
--      sequência de palavras separadas por espaço. Com isso "espada-de-são-
--      jorge" e "espada de sao jorge" chegam à mesma forma.
--
--   2. Todas as palavras digitadas precisam aparecer, em qualquer ordem e em
--      qualquer um dos dois nomes (popular ou científico). É o que faz "jorge
--      espada" e "petiveria guine" acharem o que a pessoa quer — antes, a busca
--      por substring exigia a frase inteira, na ordem exata.
--
-- Efeito colateral bem-vindo: como a normalização passa a descartar tudo que não
-- é letra ou número, os curingas de LIKE (% e _) e a barra invertida somem do
-- termo antes da comparação. O escape manual que existia em `search_species`
-- deixa de ser necessário — não há mais o que escapar.

-- ── Normalização ──────────────────────────────────────────────────────────────
-- Camada nova em cima de normalize_search_text (migration 025), que continua
-- responsável só por acento e caixa. Tudo que não for letra/número vira espaço,
-- e espaços repetidos colapsam — a forma final é sempre "palavra palavra".
create or replace function public.search_normalize(p_text text)
returns text
language sql
immutable
parallel safe
as $$
  select btrim(regexp_replace(public.normalize_search_text(p_text), '[^a-z0-9]+', ' ', 'g'))
$$;

comment on function public.search_normalize(text) is
  'Forma canônica de busca: sem acento, minúscula, e com qualquer pontuação (hífen, barra, apóstrofo) virando espaço.';

-- ── Colunas normalizadas ──────────────────────────────────────────────────────
-- As colunas geradas guardam o resultado de normalize_search_text (migration
-- 025), e o Postgres não recalcula coluna gerada quando a função muda — trocar a
-- expressão exige recriar a coluna. Como são geradas, não há dado a preservar:
-- o valor é recalculado a partir do nome original. Os índices caem junto com as
-- colunas e voltam logo abaixo.
alter table public.species
  drop column if exists common_name_normalized,
  drop column if exists scientific_name_normalized;

alter table public.species
  add column common_name_normalized text
    generated always as (public.search_normalize(common_name)) stored,
  add column scientific_name_normalized text
    generated always as (public.search_normalize(scientific_name)) stored;

comment on column public.species.common_name_normalized is
  'Nome popular em forma de busca (ver search_normalize). Alvo das buscas — não usar para exibição.';
comment on column public.species.scientific_name_normalized is
  'Nome científico em forma de busca (ver search_normalize). Alvo das buscas — não usar para exibição.';

create index if not exists species_common_name_normalized_trgm_idx
  on public.species using gin (common_name_normalized gin_trgm_ops);
create index if not exists species_scientific_name_normalized_trgm_idx
  on public.species using gin (scientific_name_normalized gin_trgm_ops);

-- ── Busca do autocomplete ─────────────────────────────────────────────────────
-- Cada palavra digitada precisa aparecer em pelo menos um dos dois nomes. A
-- ordenação continua privilegiando quem é mais "óbvio" para o termo digitado:
-- primeiro quem começa com a frase inteira, depois quem a contém, e por último
-- quem só casa palavra por palavra (que é o caso de ordem trocada).
--
-- SECURITY INVOKER (default): a RLS da migration 013 continua valendo, ou seja,
-- pendentes só aparecem para quem sugeriu e para admins.
--
-- O casamento palavra a palavra é uma varredura da tabela — o índice trigram não
-- atende essa forma. Com um catálogo de algumas centenas de espécies isso não
-- pesa, e os índices seguem servindo os filtros por frase das telas de admin. Se
-- o catálogo crescer uma ordem de grandeza, o caminho é um tsvector indexado.
create or replace function public.search_species(p_query text, p_limit int default 20)
returns setof public.species
language sql
stable
as $$
  with q as (
    select
      public.search_normalize(p_query) as frase,
      string_to_array(public.search_normalize(p_query), ' ') as palavras
  )
  select s.*
  from public.species s, q
  where q.frase <> ''
    and not exists (
      select 1
      from unnest(q.palavras) as palavra
      where s.common_name_normalized not like '%' || palavra || '%'
        and s.scientific_name_normalized not like '%' || palavra || '%'
    )
  order by
    case
      when s.common_name_normalized like q.frase || '%' then 0
      when s.scientific_name_normalized like q.frase || '%' then 1
      when s.common_name_normalized like '%' || q.frase || '%' then 2
      when s.scientific_name_normalized like '%' || q.frase || '%' then 3
      else 4
    end,
    s.common_name
  limit coalesce(p_limit, 20);
$$;

comment on function public.search_species(text, int) is
  'Busca espécies por nome popular ou científico ignorando acentos, pontuação e ordem das palavras.';
