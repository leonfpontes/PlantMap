-- Quem editou a ocorrência por último.
--
-- A tela de detalhe credita quem registrou a planta, mas quando o registro é
-- editado (pelo próprio dono ou por um admin, ver migration 012) o crédito passa
-- a ser de quem editou. Hoje não dá pra saber quem foi: `occurrences` só tem
-- `updated_at`, e o `changed_by` que existe no `occurrence_audit_log` (migration
-- 011) não serve para essa tela — a policy de select do log exige usuário
-- autenticado, e o detalhe da ocorrência é público (link compartilhado abre sem
-- login). Daí uma coluna própria em `occurrences`, que a policy de select
-- pública já cobre.
--
-- Quem preenche a coluna é uma trigger, não o app: a edição é um update direto
-- na tabela via PostgREST, então qualquer cliente poderia mandar
-- `updated_by: <outra pessoa>` no payload. Vindo de `auth.uid()` no banco, o
-- valor não tem como ser forjado.

alter table public.occurrences
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

comment on column public.occurrences.updated_by is
  'Quem fez a última edição (null = nunca editada). Preenchido pela trigger occurrence_set_updated_by, nunca pelo cliente.';

-- ── Backfill ──────────────────────────────────────────────────────────────────
-- Registros já editados antes desta migration têm o autor da edição no log de
-- auditoria; recupera o mais recente de cada um. Roda antes de criar a trigger
-- de propósito: a trigger preserva o valor antigo quando `auth.uid()` é nulo
-- (que é o caso aqui, rodando a migration), o que desfaria o próprio backfill.
--
-- A trigger de auditoria fica desligada durante o backfill para não gravar 61
-- linhas de "UPDATE por ninguém" num log que a aplicação exibe.
alter table public.occurrences disable trigger occurrence_audit_trigger;

update public.occurrences o
set updated_by = ultima_edicao.changed_by
from (
  select distinct on (occurrence_id) occurrence_id, changed_by
  from public.occurrence_audit_log
  where operation = 'UPDATE' and changed_by is not null
  order by occurrence_id, changed_at desc
) as ultima_edicao
where ultima_edicao.occurrence_id = o.id
  and o.updated_by is distinct from ultima_edicao.changed_by;

alter table public.occurrences enable trigger occurrence_audit_trigger;

-- ── Trigger ───────────────────────────────────────────────────────────────────
create or replace function public.set_occurrence_updated_by()
returns trigger
language plpgsql
security definer as $$
begin
  -- Soft delete (migration 007) também é um update, mas não é edição: o registro
  -- some da tela, e creditar quem excluiu não faria sentido nenhum.
  if old.deleted_at is null and new.deleted_at is not null then
    new.updated_by := old.updated_by;
    return new;
  end if;

  -- Update fora da API (service_role, console SQL, migration) não tem usuário
  -- associado — preserva o crédito anterior em vez de apagá-lo.
  if auth.uid() is null then
    new.updated_by := old.updated_by;
  else
    new.updated_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists occurrence_set_updated_by on public.occurrences;
create trigger occurrence_set_updated_by
  before update on public.occurrences
  for each row execute function public.set_occurrence_updated_by();

-- ── Detalhe da ocorrência ─────────────────────────────────────────────────────
-- Passa a devolver `updated_by` para a tela saber a quem creditar. A regra de
-- privacidade da migration 019 (aproximação de ~500m) continua idêntica.
-- O retorno muda, então create or replace não basta.
drop function if exists public.get_occurrence_detail(uuid);

create or replace function public.get_occurrence_detail(p_occurrence_id uuid)
returns table (
  id uuid, user_id uuid, species_id uuid, latitude float, longitude float,
  condition text, stage text, notes text, photo_url text, verified boolean,
  created_at timestamptz, updated_at timestamptz, updated_by uuid
)
language sql stable as $$
  select
    o.id, o.user_id, o.species_id,
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
    o.condition, o.stage, o.notes, o.photo_url, o.verified,
    o.created_at, o.updated_at, o.updated_by
  from public.occurrences o
  join public.profiles p on p.id = o.user_id
  where o.id = p_occurrence_id
    and o.deleted_at is null;
$$;
