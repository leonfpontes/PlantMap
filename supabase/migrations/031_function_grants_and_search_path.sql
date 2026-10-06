-- Fecha o EXECUTE das funções SECURITY DEFINER e fixa o search_path de todas.
--
-- Por padrão o Postgres dá EXECUTE de toda função nova para PUBLIC — e PUBLIC
-- inclui `anon`. Como o schema public é exposto pelo PostgREST, qualquer função
-- dele vira `/rest/v1/rpc/<nome>` para quem tem a anon key (que vai no bundle).
-- Para as funções SECURITY DEFINER isso importa, porque elas rodam como dono e
-- passam por cima da RLS. Três grupos, três tratamentos:
--
--   1. Helpers internos de pontos (`revoke_occurrence_points`,
--      `restore_occurrence_points`). Não checam auth.uid() — foram feitos para
--      os gatilhos da migration 029. Abertos como estavam, um visitante anônimo
--      conseguia zerar os pontos de qualquer usuário passando ids arbitrários.
--      Saem de PUBLIC/anon/authenticated; os gatilhos seguem chamando porque
--      também são definer e rodam como dono.
--
--   2. Funções de gatilho. Nunca deveriam ser chamadas via RPC, e gatilho não
--      checa EXECUTE na hora de disparar, então revogar de todo mundo é seguro
--      (inclusive `handle_new_user`, disparado pelo supabase_auth_admin).
--
--   3. RPCs que o app chama logado. Todas já recusam auth.uid() nulo por dentro,
--      mas não há motivo para o anon sequer alcançá-las: saem de PUBLIC/anon e
--      ficam só com authenticated (e service_role).
--
-- As funções SECURITY INVOKER de busca (search_nearby, search_species,
-- get_occurrence_detail, normalizadores) continuam públicas — o mapa funciona
-- sem login.
--
-- search_path: função sem search_path fixo resolve nomes pelo search_path de
-- quem chama, o que numa SECURITY DEFINER permite sequestrar um nome não
-- qualificado. Fixa o mesmo caminho efetivo que elas já usavam (public para o
-- PostGIS, extensions para unaccent/pg_trgm/pgcrypto) com pg_temp por último.

-- ── 1. Helpers internos de pontos ─────────────────────────────────────────────
revoke execute on function public.revoke_occurrence_points(uuid, uuid)  from public, anon, authenticated;
revoke execute on function public.restore_occurrence_points(uuid, uuid) from public, anon, authenticated;

-- ── 2. Funções de gatilho ─────────────────────────────────────────────────────
revoke execute on function public.handle_new_user()               from public, anon, authenticated;
revoke execute on function public.handle_user_updated()           from public, anon, authenticated;
revoke execute on function public.log_occurrence_change()         from public, anon, authenticated;
revoke execute on function public.log_species_change()            from public, anon, authenticated;
revoke execute on function public.revoke_points_on_hard_delete()  from public, anon, authenticated;
revoke execute on function public.set_occurrence_updated_by()     from public, anon, authenticated;
revoke execute on function public.block_spatial_ref_sys_writes()  from public, anon, authenticated;

-- ── 3. RPCs só para quem está logado ──────────────────────────────────────────
do $$
declare
  _fn regprocedure;
begin
  foreach _fn in array array[
    'public.accept_privacy_policy(boolean)',
    'public.create_species_admin(text,text,text,text,text,text)',
    'public.delete_my_account()',
    'public.delete_species_admin(uuid)',
    'public.request_occurrence_permission(text)',
    'public.resolve_support_message(uuid,text)',
    'public.review_occurrence_permission_request(uuid,boolean,text)',
    'public.review_species(uuid,boolean,text)',
    'public.set_registration_permission(uuid,boolean)',
    'public.set_species_image(uuid,text)',
    'public.soft_delete_occurrence(uuid)',
    'public.submit_species(text,text,text,text,text,text)',
    'public.submit_support_message(text,text)',
    'public.update_species_admin(uuid,text,text,text,text,text,text)'
  ]::regprocedure[] loop
    execute format('revoke execute on function %s from public, anon', _fn);
    execute format('grant execute on function %s to authenticated, service_role', _fn);
  end loop;
end $$;

-- ── search_path fixo em toda função própria do schema public ──────────────────
-- Pula as que pertencem a extensões (PostGIS) e as que já fixaram o seu.
do $$
declare
  _fn regprocedure;
begin
  for _fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) c
        where c like 'search_path=%'
      )
  loop
    execute format('alter function %s set search_path = public, extensions, pg_temp', _fn);
  end loop;
end $$;
