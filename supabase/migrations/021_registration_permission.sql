-- Login deixa de ser restrito a uma whitelist de e-mails (ver ALLOWED_EMAILS,
-- removido do callback de auth) — qualquer conta Google pode entrar agora.
-- Em troca, criar novos registros de ocorrência passa a exigir aprovação:
-- o usuário pede em /profile/permission, um admin aprova ou rejeita em
-- /admin/users. Mesmo padrão de submit_species/review_species (migration 013).
--
-- Usuários já existentes (cadastrados sob a whitelist antiga) já eram
-- confiáveis o bastante para estar lá — ganham a permissão automaticamente
-- para não perder a capacidade que já tinham. Só contas novas, a partir de
-- agora, nascem sem permissão até serem aprovadas.

alter table public.profiles
  add column can_register_occurrences boolean not null default false;

update public.profiles set can_register_occurrences = true;

create table public.occurrence_permission_requests (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references public.profiles(id) on delete cascade not null,
  message          text,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz default now() not null
);

create index occurrence_permission_requests_pending_idx
  on public.occurrence_permission_requests (created_at) where status = 'pending';

alter table public.occurrence_permission_requests enable row level security;

create policy "Usuário vê os próprios pedidos, admin vê todos"
  on public.occurrence_permission_requests for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Sem insert/update direto: tudo via RPC abaixo.
revoke insert, update on public.occurrence_permission_requests from authenticated;

create or replace function public.request_occurrence_permission(
  p_message text default null
)
returns public.occurrence_permission_requests
language plpgsql security definer as $$
declare
  _req public.occurrence_permission_requests;
  _already_allowed boolean;
  _has_pending boolean;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select can_register_occurrences into _already_allowed
  from public.profiles where id = auth.uid();

  if _already_allowed then
    raise exception 'Você já pode registrar ocorrências';
  end if;

  select exists(
    select 1 from public.occurrence_permission_requests
    where user_id = auth.uid() and status = 'pending'
  ) into _has_pending;

  if _has_pending then
    raise exception 'Você já tem um pedido em análise';
  end if;

  insert into public.occurrence_permission_requests (user_id, message)
  values (auth.uid(), nullif(trim(coalesce(p_message, '')), ''))
  returning * into _req;

  insert into public.notifications (user_id, type, title, body, link, permission_request_id)
  select p.id, 'registration_requested',
         'Novo pedido de permissão para registrar',
         coalesce((select full_name from public.profiles where id = auth.uid()), 'Um usuário') || ' quer registrar ocorrências no mapa.',
         '/admin/users', _req.id
  from public.profiles p
  where p.is_admin;

  return _req;
end;
$$;

create or replace function public.review_occurrence_permission_request(
  p_request_id uuid,
  p_approve boolean,
  p_rejection_reason text default null
)
returns public.occurrence_permission_requests
language plpgsql security definer as $$
declare
  _req public.occurrence_permission_requests;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Apenas administradores podem revisar pedidos';
  end if;

  if not p_approve and coalesce(trim(p_rejection_reason), '') = '' then
    raise exception 'Informe o motivo da rejeição';
  end if;

  update public.occurrence_permission_requests
  set
    status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    rejection_reason = case when p_approve then null else trim(p_rejection_reason) end
  where id = p_request_id
    and status = 'pending'
  returning * into _req;

  if _req.id is null then
    raise exception 'Pedido não encontrado ou já revisado';
  end if;

  if p_approve then
    update public.profiles set can_register_occurrences = true where id = _req.user_id;
  end if;

  insert into public.notifications (user_id, type, title, body, link, permission_request_id)
  values (
    _req.user_id,
    case when p_approve then 'registration_approved' else 'registration_rejected' end,
    case when p_approve then 'Você pode registrar ocorrências!' else 'Seu pedido foi recusado' end,
    case when p_approve then 'Sua permissão para registrar novas plantas no mapa foi aprovada.' else coalesce(_req.rejection_reason, 'Sem motivo informado.') end,
    '/profile', _req.id
  );

  return _req;
end;
$$;

-- Concessão/revogação direta pelo admin, sem passar por um pedido (ex.: dar
-- acesso proativamente a um médium de confiança).
create or replace function public.set_registration_permission(
  p_user_id uuid,
  p_allowed boolean
)
returns void
language plpgsql security definer as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Apenas administradores podem alterar essa permissão';
  end if;

  update public.profiles set can_register_occurrences = p_allowed where id = p_user_id;

  if p_allowed then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      p_user_id, 'registration_approved',
      'Você pode registrar ocorrências!',
      'Um administrador concedeu sua permissão para registrar novas plantas no mapa.',
      '/profile'
    );
  end if;
end;
$$;

-- Occurrences: inserir agora exige a permissão, além de ser o dono do registro.
drop policy "Usuário registra ocorrência" on public.occurrences;
create policy "Usuário com permissão registra ocorrência"
  on public.occurrences for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.can_register_occurrences)
  );

-- Notifications precisa reconhecer os novos tipos e o link para o pedido de origem.
alter table public.notifications add column permission_request_id uuid references public.occurrence_permission_requests(id) on delete cascade;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'species_approved', 'species_rejected', 'species_pending_review',
  'occurrence_verified', 'occurrence_modified_by_admin', 'occurrence_deleted_by_admin',
  'support_message', 'support_message_resolved',
  'registration_requested', 'registration_approved', 'registration_rejected'
));
