-- Funcionalidade de Privacidade: aceite da política no primeiro acesso,
-- opt-in de localização exata (com fallback de ~500m aproximados via grade),
-- exportação de dados e exclusão de conta (anonimização + bloqueio de login).

alter table public.profiles
  add column share_exact_location boolean not null default false,
  add column privacy_accepted_at timestamptz,
  add column deleted_at timestamptz;

-- share_exact_location e privacy_accepted_at são preferência do próprio usuário;
-- deleted_at só é setado pela RPC delete_my_account (security definer), nunca
-- direto pelo cliente — por isso não entra no grant abaixo.
grant update (full_name, avatar_url, theme_preference, font_scale, share_exact_location, privacy_accepted_at)
  on public.profiles to authenticated;

-- Ajusta a policy de leitura de perfis pra não expor deleted_at/share_exact_location
-- de contas excluídas de forma diferente do resto — já é `using (true)` (migration 001),
-- sem mudança necessária aqui; a anonimização acontece nos dados, não na policy.

-- search_nearby: aproxima lat/lng (grade de ~0.0045° ≈ 500m) para ocorrências de
-- usuários que não optaram por compartilhar localização exata — exceto para o
-- próprio dono e para admins, que sempre veem o ponto real.
create or replace function public.search_nearby(
  lat float, lng float, radius_m float
)
returns table (
  id uuid, user_id uuid, species_id uuid, condition text, stage text,
  notes text, photo_url text, verified boolean, created_at timestamptz,
  latitude float, longitude float, distance_m float
)
language sql stable as $$
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
    st_distance(o.location, st_point(lng, lat)::geography) as distance_m
  from public.occurrences o
  join public.profiles p on p.id = o.user_id
  where st_dwithin(o.location, st_point(lng, lat)::geography, radius_m)
    and o.deleted_at is null
  order by distance_m asc;
$$;

-- Nova RPC para a tela de detalhe de uma ocorrência (substitui o select client-side
-- que lia a coluna `location` bruta — isso vazava a coordenada exata mesmo quando
-- o dono tinha optado por não compartilhar). Mesma regra de aproximação acima.
create or replace function public.get_occurrence_detail(p_occurrence_id uuid)
returns table (
  id uuid, user_id uuid, species_id uuid, latitude float, longitude float,
  condition text, stage text, notes text, photo_url text, verified boolean,
  created_at timestamptz, updated_at timestamptz
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
    o.condition, o.stage, o.notes, o.photo_url, o.verified, o.created_at, o.updated_at
  from public.occurrences o
  join public.profiles p on p.id = o.user_id
  where o.id = p_occurrence_id
    and o.deleted_at is null;
$$;

-- Aceite da política de privacidade + escolha inicial de compartilhamento de
-- localização, feitos juntos no modal de primeiro acesso (também reusada depois
-- em /profile/privacy para trocar a escolha de localização a qualquer momento).
create or replace function public.accept_privacy_policy(p_share_exact_location boolean)
returns void
language plpgsql security definer as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  update public.profiles
  set privacy_accepted_at = now(),
      share_exact_location = p_share_exact_location
  where id = auth.uid();
end;
$$;

-- Exclusão de conta: como o login é via Google, não há o que apagar do lado do
-- provedor — o que fazemos é anonimizar o perfil, remover/ocultar tudo que o
-- usuário gerou no app e marcar a conta como excluída, o que bloqueia um novo
-- login (ver src/app/auth/callback/route.ts). Efetivamente some do PlantMap.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer as $$
declare
  _uid uuid;
begin
  _uid := auth.uid();
  if _uid is null then
    raise exception 'Não autenticado';
  end if;

  update public.occurrences set deleted_at = now() where user_id = _uid and deleted_at is null;
  delete from public.favorites where user_id = _uid;
  delete from public.notifications where user_id = _uid;

  update public.profiles
  set full_name = null,
      avatar_url = null,
      email = 'usuario-removido+' || _uid || '@anon.invalid',
      deleted_at = now()
  where id = _uid;
end;
$$;
