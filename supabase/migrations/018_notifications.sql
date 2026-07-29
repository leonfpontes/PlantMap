-- Central de notificações. Reaproveita os triggers de auditoria já existentes
-- em species (migration 013) e occurrences (migration 011) — quando um status
-- muda ou um admin mexe no registro de outra pessoa, o mesmo trigger que já
-- grava o audit log agora também gera uma notificação para o interessado.
--
-- Sinal alto, sem virar ruído: só notifica eventos que fecham um loop de
-- espera (aprovação/rejeição de erva, verificação de registro) ou que
-- avisam sobre uma ação de terceiro no que é seu (admin editando/removendo).
-- Não notifica ações do próprio dono no próprio registro.

create table public.notifications (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  type          text not null check (type in (
                  'species_approved', 'species_rejected', 'species_pending_review',
                  'occurrence_verified', 'occurrence_modified_by_admin', 'occurrence_deleted_by_admin'
                )),
  title         text not null,
  body          text,
  link          text,
  species_id    uuid references public.species(id) on delete cascade,
  occurrence_id uuid references public.occurrences(id) on delete cascade,
  read_at       timestamptz,
  created_at    timestamptz default now() not null
);

create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "Usuário vê as próprias notificações"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Sem policy de insert/delete: só as triggers abaixo (security definer) criam
-- notificações — nunca o cliente direto. Update liberado só na coluna read_at.
revoke insert, delete on public.notifications from authenticated;

create policy "Usuário marca as próprias notificações como lidas"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Habilita Realtime nesta tabela para o contador de não lidas atualizar sozinho
-- enquanto o app está aberto (ver src/hooks/useUnreadNotifications.ts).
alter publication supabase_realtime add table public.notifications;

-- Species: notifica quem sugeriu (aprovado/rejeitado) e todos os admins
-- (nova sugestão pendente). Mantém a gravação do audit log já existente.
create or replace function public.log_species_change()
returns trigger language plpgsql security definer as $$
declare
  _op text;
begin
  if TG_OP = 'INSERT' then
    insert into public.species_audit_log (species_id, changed_by, operation, old_data, new_data)
    values (NEW.id, NEW.submitted_by, 'SUBMIT', null, to_jsonb(NEW));

    if NEW.status = 'pending' then
      insert into public.notifications (user_id, type, title, body, link, species_id)
      select p.id, 'species_pending_review',
             'Nova erva aguardando revisão',
             NEW.common_name || ' foi sugerida e precisa de aprovação.',
             '/admin/species', NEW.id
      from public.profiles p
      where p.is_admin;
    end if;

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

    if _op = 'APPROVE' and NEW.submitted_by is not null then
      insert into public.notifications (user_id, type, title, body, link, species_id)
      values (
        NEW.submitted_by, 'species_approved',
        'Sua sugestão foi aprovada!',
        NEW.common_name || ' já está disponível para todos no catálogo.',
        '/profile/species', NEW.id
      );
    elsif _op = 'REJECT' and NEW.submitted_by is not null then
      insert into public.notifications (user_id, type, title, body, link, species_id)
      values (
        NEW.submitted_by, 'species_rejected',
        'Sua sugestão foi rejeitada',
        coalesce(NEW.rejection_reason, 'Sem motivo informado.'),
        '/profile/species', NEW.id
      );
    end if;

    return NEW;
  end if;

  return null;
end;
$$;

-- Occurrences: notifica o dono quando o registro é verificado, ou quando
-- alguém que não é o dono (um admin) o edita ou remove. Mantém o audit log.
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
    if OLD.deleted_at is null and NEW.deleted_at is not null then
      _op := 'SOFT_DELETE';
    else
      _op := 'UPDATE';
    end if;

    insert into public.occurrence_audit_log
      (occurrence_id, changed_by, operation, old_data, new_data)
    values
      (NEW.id, _user_id, _op, to_jsonb(OLD), to_jsonb(NEW));

    if _op = 'SOFT_DELETE' then
      if _user_id is distinct from NEW.user_id then
        insert into public.notifications (user_id, type, title, body, link, occurrence_id)
        values (
          NEW.user_id, 'occurrence_deleted_by_admin',
          'Um registro seu foi removido',
          'Um administrador do terreiro removeu um dos seus registros de ocorrência.',
          '/profile', NEW.id
        );
      end if;
    elsif _op = 'UPDATE' then
      if OLD.verified is false and NEW.verified is true then
        insert into public.notifications (user_id, type, title, body, link, occurrence_id)
        values (
          NEW.user_id, 'occurrence_verified',
          'Seu registro foi verificado',
          'Um administrador confirmou a veracidade do seu registro.',
          '/plant/' || NEW.id, NEW.id
        );
      elsif _user_id is distinct from NEW.user_id then
        insert into public.notifications (user_id, type, title, body, link, occurrence_id)
        values (
          NEW.user_id, 'occurrence_modified_by_admin',
          'Um registro seu foi alterado',
          'Um administrador do terreiro fez uma alteração em um dos seus registros.',
          '/plant/' || NEW.id, NEW.id
        );
      end if;
    end if;

    return NEW;
  end if;

  return null;
end;
$$;
