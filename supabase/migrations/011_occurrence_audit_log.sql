-- Tabela de auditoria de alterações em ocorrências
create table public.occurrence_audit_log (
  id           uuid        default gen_random_uuid() primary key,
  occurrence_id uuid        not null,
  changed_by   uuid,
  changed_at   timestamptz default now() not null,
  operation    text        not null, -- 'INSERT' | 'UPDATE' | 'SOFT_DELETE'
  old_data     jsonb,
  new_data     jsonb
);

-- Somente usuários autenticados lêem o log
alter table public.occurrence_audit_log enable row level security;

create policy "Audit log visível a usuários autenticados"
  on public.occurrence_audit_log for select
  using (auth.uid() is not null);

-- Função de trigger que grava cada alteração
create or replace function public.log_occurrence_change()
returns trigger language plpgsql security definer as $$
declare
  _user_id uuid;
  _op      text;
begin
  _user_id := auth.uid();

  if TG_OP = 'INSERT' then
    _op := 'INSERT';
    insert into public.occurrence_audit_log
      (occurrence_id, changed_by, operation, old_data, new_data)
    values
      (NEW.id, _user_id, _op, null, to_jsonb(NEW));
    return NEW;

  elsif TG_OP = 'UPDATE' then
    -- Distingue soft delete de edição comum
    if OLD.deleted_at is null and NEW.deleted_at is not null then
      _op := 'SOFT_DELETE';
    else
      _op := 'UPDATE';
    end if;

    insert into public.occurrence_audit_log
      (occurrence_id, changed_by, operation, old_data, new_data)
    values
      (NEW.id, _user_id, _op, to_jsonb(OLD), to_jsonb(NEW));
    return NEW;
  end if;

  return null;
end;
$$;

-- Trigger disparado após INSERT ou UPDATE na tabela de ocorrências
create trigger occurrence_audit_trigger
  after insert or update on public.occurrences
  for each row execute function public.log_occurrence_change();
