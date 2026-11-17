-- ============================================================================
-- 032 — "Visitei": relatos da comunidade sobre plantas + fichas de uso das ervas
-- ============================================================================
--
-- 1. Qualquer pessoa logada diz se a planta ainda está lá e como ela está.
--    "Está aqui" atualiza a condição e o "visto há X dias" do registro;
--    "Não encontrei" conta para a fila de arquivamento do admin.
-- 2. A partir de GONE_THRESHOLD (3) pessoas diferentes dizendo que sumiu —
--    contadas desde o último "está aqui" — o registro cai na fila do admin,
--    que arquiva (some do mapa sem tirar os pontos de ninguém) ou mantém.
-- 3. Cada relato vale 10 pontos, no máximo 1x por pessoa por planta a cada
--    7 dias: dá pra relatar mais vezes, só não pontua de novo.
-- 4. Fichas de uso das ervas (species_profiles), lidas só por quem fez login:
--    o conteúdo vem do guia de ervas da casa e é ensinamento do terreiro.
--
-- O conteúdo das fichas NÃO está neste arquivo (o repositório é público): é
-- carregado direto no banco por scripts/import-species-profiles.mjs.
-- ============================================================================


-- ── Colunas novas em occurrences ─────────────────────────────────────────────

alter table public.occurrences
  add column if not exists last_seen_at    timestamptz,
  add column if not exists gone_reports    int not null default 0,
  add column if not exists gone_flagged_at timestamptz,
  add column if not exists archived_reason text;

comment on column public.occurrences.last_seen_at is
  'Última vez que alguém confirmou a planta no lugar (relato "está aqui" ou edição do dono).';
comment on column public.occurrences.gone_reports is
  'Pessoas diferentes que disseram "não encontrei" desde o último "está aqui".';
comment on column public.occurrences.gone_flagged_at is
  'Quando o registro entrou na fila de arquivamento do admin (null = fora da fila).';
comment on column public.occurrences.archived_reason is
  'Preenchido quando o admin arquiva por relatos de que a planta sumiu.';

-- Ponto de partida do "visto há X dias": a última edição ou o cadastro.
-- Com o gatilho de auditoria desligado: senão este update em massa entraria
-- no log e mandaria a cada dono "um administrador alterou seu registro".
alter table public.occurrences disable trigger occurrence_audit_trigger;
update public.occurrences
set last_seen_at = coalesce(updated_at, created_at)
where last_seen_at is null;
alter table public.occurrences enable trigger occurrence_audit_trigger;

create index if not exists occurrences_gone_flagged_idx
  on public.occurrences (gone_flagged_at)
  where gone_flagged_at is not null and deleted_at is null;


-- ── Relatos ──────────────────────────────────────────────────────────────────

create table if not exists public.occurrence_reports (
  id            uuid default gen_random_uuid() primary key,
  occurrence_id uuid not null references public.occurrences(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        text not null check (status in ('present', 'gone')),
  condition     text check (condition in ('healthy', 'fair', 'poor', 'dead')),
  created_at    timestamptz not null default now(),
  -- "Está aqui" sempre diz como está; "não encontrei" nunca.
  constraint occurrence_reports_status_condition_check
    check ((status = 'present') = (condition is not null))
);

create index if not exists occurrence_reports_occ_idx
  on public.occurrence_reports (occurrence_id, created_at desc);
create index if not exists occurrence_reports_user_idx
  on public.occurrence_reports (user_id);

alter table public.occurrence_reports enable row level security;

-- Cada um vê os próprios relatos; o admin vê todos (fila de arquivamento).
create policy "Relatos visíveis ao autor e ao admin"
  on public.occurrence_reports for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Nada de insert/update/delete direto: tudo passa por report_occurrence.
revoke insert, update, delete on public.occurrence_reports from anon, authenticated;


-- ── Pontos e notificações aceitam os tipos novos ─────────────────────────────

alter table public.points_log drop constraint points_log_reason_check;
alter table public.points_log add constraint points_log_reason_check
  check (reason in ('register', 'maintain', 'revoke', 'restore', 'report'));

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'species_approved', 'species_rejected', 'species_pending_review',
  'occurrence_verified', 'occurrence_modified_by_admin', 'occurrence_deleted_by_admin',
  'support_message', 'support_message_resolved',
  'registration_requested', 'registration_approved', 'registration_rejected',
  'occurrence_reported_gone', 'occurrence_gone_flagged', 'occurrence_archived'
));


-- ── Gatilhos de occurrences: reconhecem relato e arquivamento ────────────────
--
-- report_occurrence e resolve_gone_flag atualizam occurrences sob uma flag de
-- transação (set_config(..., true)). Sem isso, o gatilho de auditoria trataria
-- o relato de um terceiro como "um administrador alterou seu registro", e o
-- arquivamento como exclusão — tirando os pontos do dono por uma planta que
-- simplesmente morreu.

create or replace function public.set_occurrence_updated_by()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp as $$
begin
  -- Relato de visita não é edição: o crédito de "atualizado por" não muda.
  if coalesce(current_setting('plantmap.from_report', true), '') = 'on' then
    new.updated_by := old.updated_by;
    return new;
  end if;

  if old.deleted_at is null and new.deleted_at is not null then
    new.updated_by := old.updated_by;
    return new;
  end if;

  if auth.uid() is null then
    new.updated_by := old.updated_by;
  else
    new.updated_by := auth.uid();
  end if;

  return new;
end;
$$;

create or replace function public.log_occurrence_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp as $$
declare
  _user_id     uuid;
  _op          text;
  _from_report boolean := coalesce(current_setting('plantmap.from_report', true), '') = 'on';
  _archive     boolean := coalesce(current_setting('plantmap.archive', true), '') = 'on';
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

    -- Manutenção do dono: 5 pontos, no máximo 1x a cada 30 dias. A carência
    -- olha só os pontos de cadastro/manutenção do próprio dono — antes olhava
    -- qualquer lançamento na planta, e o relato de outra pessoa bloquearia.
    if _op = 'UPDATE'
       and not _from_report
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
           and user_id = NEW.user_id
           and reason in ('register', 'maintain')
           and created_at > now() - interval '30 days'
       )
    then
      insert into public.points_log (user_id, occurrence_id, reason, points)
      values (NEW.user_id, NEW.id, 'maintain', 5);
      update public.profiles set points = points + 5 where id = NEW.user_id;
    end if;

    if _op = 'SOFT_DELETE' then
      if _archive then
        -- Arquivada porque sumiu: ninguém perde ponto, o dono só é avisado.
        insert into public.notifications (user_id, type, title, body, link, occurrence_id)
        values (
          NEW.user_id, 'occurrence_archived',
          'Uma planta sua foi arquivada',
          'Várias pessoas não encontraram mais a planta no lugar, e a administração a tirou do mapa. Seus pontos continuam.',
          '/profile', NEW.id
        );
      else
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
      end if;
    elsif _op = 'RESTORE' then
      if not _archive then
        perform public.restore_occurrence_points(NEW.id, NEW.user_id);
      end if;
    elsif _op = 'UPDATE' and not _from_report then
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

-- Edição do próprio dono também conta como "visto": ele esteve lá.
create or replace function public.touch_occurrence_last_seen()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp as $$
begin
  if coalesce(current_setting('plantmap.from_report', true), '') <> 'on'
     and auth.uid() = new.user_id
     and new.deleted_at is null
  then
    new.last_seen_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists occurrence_touch_last_seen on public.occurrences;
create trigger occurrence_touch_last_seen
  before update on public.occurrences
  for each row execute function public.touch_occurrence_last_seen();

-- Cadastro novo nasce "visto agora".
alter table public.occurrences alter column last_seen_at set default now();


-- ── RPC: relatar uma visita ──────────────────────────────────────────────────

create or replace function public.report_occurrence(
  _occurrence_id uuid,
  _status        text,
  _condition     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp as $$
declare
  _uid          uuid := auth.uid();
  _occ          public.occurrences%rowtype;
  _points       int := 0;
  _gone_count   int := 0;
  _last_present timestamptz;
  _threshold    constant int := 3;
  _cooldown     constant interval := interval '7 days';
  _flagged_now  boolean := false;
begin
  if _uid is null then
    raise exception 'Entre na sua conta para relatar uma visita.';
  end if;
  if _status not in ('present', 'gone') then
    raise exception 'Relato inválido.';
  end if;
  if _status = 'present' and (_condition is null or _condition not in ('healthy', 'fair', 'poor', 'dead')) then
    raise exception 'Diga como a planta está.';
  end if;

  select * into _occ from public.occurrences where id = _occurrence_id and deleted_at is null;
  if not found then
    raise exception 'Esta planta não está mais no mapa.';
  end if;

  insert into public.occurrence_reports (occurrence_id, user_id, status, condition)
  values (_occurrence_id, _uid, _status, case when _status = 'present' then _condition end);

  -- 10 pontos, no máximo 1x por pessoa por planta a cada 7 dias.
  if not exists (
    select 1 from public.points_log
    where user_id = _uid
      and occurrence_id = _occurrence_id
      and reason = 'report'
      and created_at > now() - _cooldown
  ) then
    insert into public.points_log (user_id, occurrence_id, reason, points)
    values (_uid, _occurrence_id, 'report', 10);
    update public.profiles set points = points + 10 where id = _uid;
    _points := 10;
  end if;

  perform set_config('plantmap.from_report', 'on', true);

  if _status = 'present' then
    -- Alguém viu: a contagem de "sumiu" recomeça e sai da fila do admin.
    update public.occurrences
    set condition = _condition,
        last_seen_at = now(),
        gone_reports = 0,
        gone_flagged_at = null
    where id = _occurrence_id;
  else
    select max(created_at) into _last_present
    from public.occurrence_reports
    where occurrence_id = _occurrence_id and status = 'present';

    select count(distinct user_id) into _gone_count
    from public.occurrence_reports
    where occurrence_id = _occurrence_id
      and status = 'gone'
      and created_at > coalesce(_last_present, '-infinity'::timestamptz);

    _flagged_now := _gone_count >= _threshold and _occ.gone_flagged_at is null;

    update public.occurrences
    set gone_reports = _gone_count,
        gone_flagged_at = case when _gone_count >= _threshold then coalesce(gone_flagged_at, now()) else gone_flagged_at end
    where id = _occurrence_id;

    -- O dono fica sabendo (se não foi ele mesmo quem relatou).
    if _occ.user_id <> _uid then
      insert into public.notifications (user_id, type, title, body, link, occurrence_id)
      values (
        _occ.user_id, 'occurrence_reported_gone',
        'Alguém não encontrou uma planta sua',
        'Uma pessoa passou pelo local e não encontrou a planta. Se ela ainda estiver lá, abra o registro e confirme.',
        '/plant/' || _occurrence_id, _occurrence_id
      );
    end if;

    -- Chegou ao limite: avisa os admins uma vez.
    if _flagged_now then
      insert into public.notifications (user_id, type, title, body, link, occurrence_id)
      select p.id, 'occurrence_gone_flagged',
        'Planta pode ter sumido',
        _gone_count || ' pessoas não encontraram uma planta. Decida se ela deve ser arquivada.',
        '/admin/gone', _occurrence_id
      from public.profiles p
      where p.is_admin;
    end if;
  end if;

  perform set_config('plantmap.from_report', '', true);

  return jsonb_build_object(
    'points_awarded', _points,
    'gone_reports', _gone_count,
    'flagged', _gone_count >= _threshold
  );
end;
$$;

revoke execute on function public.report_occurrence(uuid, text, text) from public, anon;
grant execute on function public.report_occurrence(uuid, text, text) to authenticated;


-- ── RPC: decisão do admin sobre uma planta marcada como sumida ──────────────

create or replace function public.resolve_gone_flag(_occurrence_id uuid, _action text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Somente administradores.';
  end if;

  if _action = 'archive' then
    perform set_config('plantmap.archive', 'on', true);
    update public.occurrences
    set deleted_at = now(),
        archived_reason = 'gone',
        gone_flagged_at = null
    where id = _occurrence_id and deleted_at is null;
    perform set_config('plantmap.archive', '', true);
  elsif _action = 'keep' then
    -- A planta continua lá: zera a contagem como se alguém a tivesse visto.
    perform set_config('plantmap.from_report', 'on', true);
    update public.occurrences
    set gone_reports = 0,
        gone_flagged_at = null,
        last_seen_at = now()
    where id = _occurrence_id;
    perform set_config('plantmap.from_report', '', true);
    -- Relato "está aqui" sem condição nova não existe; registra a decisão
    -- como relato do admin com a condição atual, para a contagem recomeçar.
    insert into public.occurrence_reports (occurrence_id, user_id, status, condition)
    select id, auth.uid(), 'present', coalesce(condition, 'healthy') from public.occurrences where id = _occurrence_id;
  else
    raise exception 'Ação inválida.';
  end if;
end;
$$;

revoke execute on function public.resolve_gone_flag(uuid, text) from public, anon;
grant execute on function public.resolve_gone_flag(uuid, text) to authenticated;


-- ── Buscas devolvem "visto há" e relatos de sumiço ───────────────────────────

drop function if exists public.search_nearby(float, float, float, int);
create or replace function public.search_nearby(
  lat float, lng float, radius_m float default null, max_results int default null
)
returns table (
  id uuid, user_id uuid, species_id uuid, condition text, stage text,
  notes text, photo_url text, verified boolean, created_at timestamptz,
  latitude float, longitude float, distance_m float,
  last_seen_at timestamptz, gone_reports int
)
language sql stable
set search_path = public, extensions, pg_temp as $$
  select
    o.id, o.user_id, o.species_id, o.condition, o.stage,
    o.notes, o.photo_url, o.verified, o.created_at,
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
    st_distance(o.location, st_point(lng, lat)::geography) as distance_m,
    o.last_seen_at, o.gone_reports
  from public.occurrences o
  join public.profiles p on p.id = o.user_id
  where (
      radius_m is null
      or radius_m <= 0
      or st_dwithin(o.location, st_point(lng, lat)::geography, radius_m)
    )
    and o.deleted_at is null
  order by distance_m asc
  limit max_results;
$$;

drop function if exists public.get_occurrence_detail(uuid);
create or replace function public.get_occurrence_detail(p_occurrence_id uuid)
returns table (
  id uuid, user_id uuid, species_id uuid, latitude float, longitude float,
  condition text, stage text, notes text, photo_url text, verified boolean,
  created_at timestamptz, updated_at timestamptz, updated_by uuid,
  last_seen_at timestamptz, gone_reports int
)
language sql stable
set search_path = public, extensions, pg_temp as $$
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
    o.created_at, o.updated_at, o.updated_by,
    o.last_seen_at, o.gone_reports
  from public.occurrences o
  join public.profiles p on p.id = o.user_id
  where o.id = p_occurrence_id
    and o.deleted_at is null;
$$;


-- ── Fichas de uso das ervas ──────────────────────────────────────────────────

create table if not exists public.species_profiles (
  species_id     uuid primary key references public.species(id) on delete cascade,
  -- 'casa' = guia de ervas do terreiro (Brain); 'web' = pesquisa pública.
  fonte          text not null check (fonte in ('casa', 'web')),
  resumo         text,
  temperatura    text,
  parte_usada    text,
  cor            text,
  orixas         text[] not null default '{}',
  verbos         text[] not null default '{}',
  para_que_serve text[] not null default '{}',
  uso_ritual     text[] not null default '{}',
  cuidados       text[] not null default '{}',
  fontes_urls    text[] not null default '{}',
  updated_at     timestamptz not null default now()
);

alter table public.species_profiles enable row level security;

-- Só quem fez login: é ensinamento da casa, não conteúdo aberto da web.
create policy "Fichas visíveis a quem fez login"
  on public.species_profiles for select
  to authenticated
  using (true);

create policy "Fichas editáveis por admin"
  on public.species_profiles for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

revoke all on public.species_profiles from anon;


-- ── Admin recebe a fila nova em tempo real ───────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'occurrence_reports'
  ) then
    alter publication supabase_realtime add table public.occurrence_reports;
  end if;
end;
$$;
