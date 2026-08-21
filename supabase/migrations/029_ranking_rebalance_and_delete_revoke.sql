-- Rebalanceia o teto do ranking e fecha o exploit de excluir/recadastrar.
--
-- Contexto: o topo da escada (Ancestral Verde, 600 pontos) já foi alcançado, o
-- que zera o incentivo de quem chegou lá. Ao invés de mexer nos limiares já
-- conquistados (o que rebaixaria gente), a escada ganha quatro degraus novos
-- acima do 600 — 1200 / 2500 / 5000 / 10000. Esses limiares vivem só no
-- TypeScript (src/constants/ranking.ts), porque o banco guarda pontos, não
-- tier; esta migration não precisa de nenhuma mudança de esquema pra isso.
--
-- O que ESTA migration muda é a outra ponta do mesmo problema: hoje excluir
-- uma ocorrência não devolve os pontos que ela deu. Como o cadastro paga +10
-- na hora, dava pra cadastrar e excluir em looping e subir de tier sem
-- registrar nada de verdade — o que, com degraus mais altos, viraria o caminho
-- mais curto pro topo em vez do mais longo.
--
-- A correção segue o padrão do próprio points_log: nada é apagado nem
-- recalculado à mão. Uma exclusão gera uma linha compensatória negativa
-- ('revoke') e um restore gera a linha positiva de volta ('restore'), então
-- profiles.points continua sendo exatamente a soma do log, e o histórico
-- mostra o que aconteceu e quando.

-- 1. Novos motivos no log. 'revoke' guarda valor negativo; 'restore', positivo.
alter table public.points_log drop constraint points_log_reason_check;
alter table public.points_log add constraint points_log_reason_check
  check (reason in ('register', 'maintain', 'revoke', 'restore'));

-- 2. Estorno. Idempotente por construção: a soma varre TODAS as linhas da
-- ocorrência, inclusive estornos anteriores, então um segundo estorno vê saldo
-- zero e não faz nada. Também é seguro em ocorrência antiga sem log (o saldo
-- é zero) — nunca deixa profiles.points negativo, porque só tira o que aquela
-- ocorrência de fato deu.
create or replace function public.revoke_occurrence_points(_occurrence_id uuid, _user_id uuid)
returns void language plpgsql security definer as $$
declare
  _saldo int;
begin
  select coalesce(sum(points), 0) into _saldo
  from public.points_log
  where occurrence_id = _occurrence_id and user_id = _user_id;

  if _saldo <= 0 then return; end if;

  insert into public.points_log (user_id, occurrence_id, reason, points)
  values (_user_id, _occurrence_id, 'revoke', -_saldo);

  update public.profiles set points = points - _saldo where id = _user_id;
end;
$$;

-- 3. Devolução, para o caso de um registro voltar do soft delete. Repõe
-- exatamente o que foi estornado (concedido menos saldo atual): se nada foi
-- estornado, a diferença é zero e a função não faz nada.
create or replace function public.restore_occurrence_points(_occurrence_id uuid, _user_id uuid)
returns void language plpgsql security definer as $$
declare
  _devido int;
begin
  select coalesce(sum(points) filter (where reason in ('register', 'maintain')), 0)
       - coalesce(sum(points), 0)
    into _devido
  from public.points_log
  where occurrence_id = _occurrence_id and user_id = _user_id;

  if _devido <= 0 then return; end if;

  insert into public.points_log (user_id, occurrence_id, reason, points)
  values (_user_id, _occurrence_id, 'restore', _devido);

  update public.profiles set points = points + _devido where id = _user_id;
end;
$$;

-- 4. Reescreve a trigger de auditoria (migration 011 → 018 → 023) mantendo
-- intactos audit log, notificações e concessão de pontos; o que entra é o
-- estorno no soft delete e a devolução no restore.
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

    insert into public.points_log (user_id, occurrence_id, reason, points)
    values (NEW.user_id, NEW.id, 'register', 10);

    update public.profiles set points = points + 10 where id = NEW.user_id;

    return NEW;

  elsif TG_OP = 'UPDATE' then
    if OLD.deleted_at is null and NEW.deleted_at is not null then
      _op := 'SOFT_DELETE';
    elsif OLD.deleted_at is not null and NEW.deleted_at is null then
      _op := 'RESTORE';
    else
      _op := 'UPDATE';
    end if;

    insert into public.occurrence_audit_log
      (occurrence_id, changed_by, operation, old_data, new_data)
    values
      (NEW.id, _user_id, _op, to_jsonb(OLD), to_jsonb(NEW));

    -- Manutenção só conta pro dono cuidando do próprio registro (edição por
    -- admin não pontua pro dono), só quando algo que reflete cuidado real
    -- mudou, e só uma vez a cada 30 dias por ocorrência.
    if _op = 'UPDATE'
       and _user_id = NEW.user_id
       and (
         OLD.condition is distinct from NEW.condition
         or OLD.stage is distinct from NEW.stage
         or OLD.photo_url is distinct from NEW.photo_url
         or OLD.notes is distinct from NEW.notes
       )
       and not exists (
         select 1 from public.points_log
         where occurrence_id = NEW.id
           and created_at > now() - interval '30 days'
       )
    then
      insert into public.points_log (user_id, occurrence_id, reason, points)
      values (NEW.user_id, NEW.id, 'maintain', 5);

      update public.profiles set points = points + 5 where id = NEW.user_id;
    end if;

    if _op = 'SOFT_DELETE' then
      -- O estorno é sempre do dono do registro, não de quem apagou: se um
      -- admin remove a ocorrência de alguém, quem perde os pontos daquela
      -- ocorrência é o dono, que é quem os ganhou.
      perform public.revoke_occurrence_points(NEW.id, NEW.user_id);

      if _user_id is distinct from NEW.user_id then
        insert into public.notifications (user_id, type, title, body, link, occurrence_id)
        values (
          NEW.user_id, 'occurrence_deleted_by_admin',
          'Um registro seu foi removido',
          'Um administrador do terreiro removeu um dos seus registros de ocorrência.',
          '/profile', NEW.id
        );
      end if;

    elsif _op = 'RESTORE' then
      perform public.restore_occurrence_points(NEW.id, NEW.user_id);

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

-- 5. O app só exclui via soft delete (RPC soft_delete_occurrence), mas o
-- grant de DELETE em occurrences continuava aberto pro cliente — e um DELETE
-- físico escapa da trigger acima (que é de insert/update), levando junto o
-- audit log e deixando os pontos de pé. Duas travas:
--    a) trigger de BEFORE DELETE, pra estornar mesmo num apagamento físico
--       feito por service_role/console. É BEFORE de propósito: depois do
--       DELETE o `on delete set null` da FK já zerou points_log.occurrence_id
--       e não daria mais pra somar o que aquela ocorrência tinha dado.
create or replace function public.revoke_points_on_hard_delete()
returns trigger language plpgsql security definer as $$
begin
  perform public.revoke_occurrence_points(OLD.id, OLD.user_id);
  return OLD;
end;
$$;

create trigger occurrence_revoke_points_before_delete
  before delete on public.occurrences
  for each row execute function public.revoke_points_on_hard_delete();

--    b) e fecha o DELETE físico pro cliente de vez: exclusão de ocorrência é
--       sempre lógica, pelo mesmo motivo que a migration 007 introduziu o
--       soft delete (preservar histórico e auditoria).
revoke delete on public.occurrences from authenticated, anon;

drop policy if exists "Usuário ou admin deleta ocorrência" on public.occurrences;

-- 6. Regulariza o passivo: ocorrências já excluídas antes desta migration
-- continuam pagando pontos ao dono. Estorna todas de uma vez, pela mesma
-- função (então o log fica com a mesma cara de um estorno normal).
do $$
declare
  _o record;
begin
  for _o in
    select id, user_id from public.occurrences where deleted_at is not null
  loop
    perform public.revoke_occurrence_points(_o.id, _o.user_id);
  end loop;
end;
$$;
