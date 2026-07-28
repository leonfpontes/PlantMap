-- Fluxo de moderação para cadastro de novas espécies pelos usuários.
--
-- Hoje o catálogo de espécies só existe via seed/migration SQL e a tabela não tem
-- RLS habilitada (qualquer papel com grant no schema public podia inserir/alterar
-- direto pela API REST, sem controle nenhum). Esta migration:
--   1. Adiciona um fluxo de submissão: usuário sugere uma espécie, ela nasce
--      'pending' e só é visível para quem sugeriu (e para admins) até ser revisada.
--   2. Relaxa `scientific_name` para opcional — quem está sugerindo a espécie
--      (ex.: um médium cadastrando uma erva de uso ritual) frequentemente conhece
--      o nome popular/religioso, mas não o nome científico.
--   3. Audita toda submissão/aprovação/rejeição, no mesmo padrão de
--      `occurrence_audit_log` (migration 011).

alter table public.species alter column scientific_name drop not null;

alter table public.species
  add column status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  add column submitted_by uuid references public.profiles(id) on delete set null,
  add column reviewed_by uuid references public.profiles(id) on delete set null,
  add column reviewed_at timestamptz,
  add column rejection_reason text;

-- Espécies pré-existentes (seed) já nascem com status = 'approved' (valor default da coluna).

alter table public.species enable row level security;

-- Select: aprovadas são públicas; pendentes/rejeitadas só para quem sugeriu ou admin.
create policy "Espécies aprovadas visíveis a todos, pendentes só ao autor/admin"
  on public.species for select
  using (
    status = 'approved'
    or submitted_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Nenhum insert/update direto pela API: tudo passa pelas RPCs abaixo (security definer),
-- que controlam status, submitted_by e reviewed_by em vez de deixar o cliente setá-los.
revoke insert, update on public.species from authenticated;

-- Submissão de nova espécie por um usuário autenticado. Sempre nasce 'pending'.
create or replace function public.submit_species(
  p_common_name text,
  p_scientific_name text default null,
  p_family text default null,
  p_origin text default 'native',
  p_description text default null,
  p_image_url text default null
)
returns public.species
language plpgsql security definer as $$
declare
  _species public.species;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if coalesce(trim(p_common_name), '') = '' then
    raise exception 'Nome popular é obrigatório';
  end if;

  insert into public.species (
    common_name, scientific_name, family, origin, description, image_url,
    status, submitted_by
  ) values (
    trim(p_common_name), nullif(trim(coalesce(p_scientific_name, '')), ''), p_family, p_origin, p_description, p_image_url,
    'pending', auth.uid()
  )
  returning * into _species;

  return _species;
end;
$$;

-- Aprovação/rejeição por admin. `p_approve = false` exige motivo.
create or replace function public.review_species(
  p_species_id uuid,
  p_approve boolean,
  p_rejection_reason text default null
)
returns public.species
language plpgsql security definer as $$
declare
  _species public.species;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Apenas administradores podem revisar espécies';
  end if;

  if not p_approve and coalesce(trim(p_rejection_reason), '') = '' then
    raise exception 'Informe o motivo da rejeição';
  end if;

  update public.species
  set
    status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    rejection_reason = case when p_approve then null else trim(p_rejection_reason) end
  where id = p_species_id
    and status = 'pending'
  returning * into _species;

  if _species.id is null then
    raise exception 'Espécie não encontrada ou já revisada';
  end if;

  return _species;
end;
$$;

-- Auditoria de submissões/revisões (mesmo padrão de occurrence_audit_log).
create table public.species_audit_log (
  id         uuid default gen_random_uuid() primary key,
  species_id uuid not null,
  changed_by uuid,
  changed_at timestamptz default now() not null,
  operation  text not null, -- 'SUBMIT' | 'APPROVE' | 'REJECT'
  old_data   jsonb,
  new_data   jsonb
);

alter table public.species_audit_log enable row level security;

create policy "Audit log de espécies visível a admins"
  on public.species_audit_log for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create or replace function public.log_species_change()
returns trigger language plpgsql security definer as $$
declare
  _op text;
begin
  if TG_OP = 'INSERT' then
    insert into public.species_audit_log (species_id, changed_by, operation, old_data, new_data)
    values (NEW.id, NEW.submitted_by, 'SUBMIT', null, to_jsonb(NEW));
    return NEW;

  elsif TG_OP = 'UPDATE' then
    if OLD.status = 'pending' and NEW.status = 'approved' then
      _op := 'APPROVE';
    elsif OLD.status = 'pending' and NEW.status = 'rejected' then
      _op := 'REJECT';
    else
      _op := 'UPDATE';
    end if;

    insert into public.species_audit_log (species_id, changed_by, operation, old_data, new_data)
    values (NEW.id, NEW.reviewed_by, _op, to_jsonb(OLD), to_jsonb(NEW));
    return NEW;
  end if;

  return null;
end;
$$;

create trigger species_audit_trigger
  after insert or update on public.species
  for each row execute function public.log_species_change();
