-- CRUD manual de espécies para administradores (/admin/species).
--
-- Até aqui só existiam dois caminhos de escrita em `species`: `submit_species`
-- (usuário sugere, nasce 'pending') e `review_species`/`set_species_image`
-- (admin aprova/rejeita/troca foto de uma sugestão pendente ou já aprovada).
-- Não havia forma de um admin cadastrar uma erva diretamente já aprovada,
-- editar os dados de uma espécie existente, ou excluí-la. Como a migration 013
-- revogou insert/update de `authenticated` e a RLS nunca teve política de
-- delete, tudo precisa passar por RPC security definer — mesmo padrão já
-- usado no arquivo.

-- Cadastro direto por admin: nasce já 'approved' (não passa pela fila de
-- moderação, que é para sugestões de usuários comuns).
create or replace function public.create_species_admin(
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
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Apenas administradores podem cadastrar espécies diretamente';
  end if;

  if coalesce(trim(p_common_name), '') = '' then
    raise exception 'Nome popular é obrigatório';
  end if;

  insert into public.species (
    common_name, scientific_name, family, origin, description, image_url,
    status, submitted_by, reviewed_by, reviewed_at
  ) values (
    trim(p_common_name), nullif(trim(coalesce(p_scientific_name, '')), ''), p_family, p_origin, p_description, p_image_url,
    'approved', null, auth.uid(), now()
  )
  returning * into _species;

  return _species;
end;
$$;

-- Edição dos dados de uma espécie já existente, qualquer que seja seu status.
-- Não mexe em status/reviewed_by/reviewed_at: isso continua sendo papel exclusivo
-- de `review_species`, para não confundir "editar dados" com "revisar sugestão".
create or replace function public.update_species_admin(
  p_species_id uuid,
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
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Apenas administradores podem editar espécies';
  end if;

  if coalesce(trim(p_common_name), '') = '' then
    raise exception 'Nome popular é obrigatório';
  end if;

  update public.species
  set
    common_name = trim(p_common_name),
    scientific_name = nullif(trim(coalesce(p_scientific_name, '')), ''),
    family = p_family,
    origin = p_origin,
    description = p_description,
    image_url = p_image_url
  where id = p_species_id
  returning * into _species;

  if _species.id is null then
    raise exception 'Espécie não encontrada';
  end if;

  return _species;
end;
$$;

-- Exclusão definitiva. Bloqueada se existir ocorrência registrada apontando
-- para a espécie (species_id em `occurrences` é `references ... on delete`
-- sem cascade, ou seja, sem esta checagem o delete falharia de qualquer forma
-- com um erro de FK menos claro para o admin).
create or replace function public.delete_species_admin(p_species_id uuid)
returns void
language plpgsql security definer as $$
declare
  _occurrence_count int;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Apenas administradores podem excluir espécies';
  end if;

  select count(*) into _occurrence_count from public.occurrences where species_id = p_species_id;
  if _occurrence_count > 0 then
    raise exception 'Não é possível excluir: % ocorrência(s) registrada(s) usam esta espécie', _occurrence_count;
  end if;

  delete from public.species where id = p_species_id;

  if not found then
    raise exception 'Espécie não encontrada';
  end if;
end;
$$;

-- Auditoria (species_audit_log, migration 013) passa a cobrir também
-- cadastro direto por admin e exclusão, não só submissão/aprovação/rejeição.
create or replace function public.log_species_change()
returns trigger language plpgsql security definer as $$
declare
  _op text;
begin
  if TG_OP = 'INSERT' then
    _op := case when NEW.submitted_by is null then 'CREATE_ADMIN' else 'SUBMIT' end;
    insert into public.species_audit_log (species_id, changed_by, operation, old_data, new_data)
    values (NEW.id, coalesce(NEW.submitted_by, NEW.reviewed_by), _op, null, to_jsonb(NEW));
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
    values (NEW.id, coalesce(NEW.reviewed_by, auth.uid()), _op, to_jsonb(OLD), to_jsonb(NEW));
    return NEW;

  elsif TG_OP = 'DELETE' then
    insert into public.species_audit_log (species_id, changed_by, operation, old_data, new_data)
    values (OLD.id, auth.uid(), 'DELETE', to_jsonb(OLD), null);
    return OLD;
  end if;

  return null;
end;
$$;

drop trigger if exists species_audit_trigger on public.species;

create trigger species_audit_trigger
  after insert or update or delete on public.species
  for each row execute function public.log_species_change();
