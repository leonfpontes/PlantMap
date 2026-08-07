-- Gamificação: ranking de médiuns por cadastro e manutenção de ocorrências.
--
-- Recompensa dois eventos: registrar uma ocorrência nova, e "cuidar" de uma
-- já existente (atualizar condição/estágio/foto/notas). O segundo é limitado
-- por um cooldown por ocorrência (evita farm de save repetido) mas, somado ao
-- longo de meses de manutenção, supera o valor único do cadastro — é assim
-- que o ranking reforça quem cuida dos próprios registros, não só quem
-- cadastra e abandona.
--
-- Reaproveita o mesmo padrão já usado no projeto (migrations 013, 018, 020,
-- 022): tabela nova + RLS + revoke de escrita direta do client + a escrita
-- real acontece só numa trigger/RPC security definer. O contador em
-- profiles.points nunca é o único registro: tudo passa por um log
-- append-only (points_log) primeiro, então o total é sempre re-derivável e
-- dá pra auditar quem ganhou o quê e quando — e abre espaço pra bônus/streak
-- futuros só com um novo valor de `reason`, sem reescrever o esquema.

-- Contador de pontos. Server-only: segue o mesmo padrão em vigor desde a
-- migration 012 (revoke update on profiles from authenticated + grant
-- explícito só das colunas editáveis pelo próprio usuário) — `points` não
-- entra nesse grant, só a trigger abaixo escreve nela.
alter table public.profiles add column points integer not null default 0;

create index profiles_points_idx on public.profiles (points desc) where deleted_at is null;

-- Log append-only de cada concessão de pontos.
create table public.points_log (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  occurrence_id uuid references public.occurrences(id) on delete set null,
  reason        text not null check (reason in ('register', 'maintain')),
  points        int not null,
  created_at    timestamptz default now() not null
);

create index points_log_user_idx on public.points_log (user_id);
-- Usado pela checagem de cooldown de manutenção (ver trigger abaixo).
create index points_log_occurrence_created_idx on public.points_log (occurrence_id, created_at desc);

alter table public.points_log enable row level security;

create policy "Usuário vê o próprio histórico de pontos, admin vê tudo"
  on public.points_log for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Sem policy de insert/update/delete: só a trigger abaixo (security definer)
-- escreve aqui, nunca o cliente direto.
revoke insert, update, delete on public.points_log from authenticated;

-- Estende a função já existente (migration 011, reescrita em 018 para
-- notificações) — mantém intacta toda a lógica de audit log e notificação,
-- só adiciona os branches de pontos por cima.
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
