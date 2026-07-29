-- Canal "Fale com a administração" da tela Ajuda e Suporte. Mesmo padrão de
-- submit_species/review_species (migration 013): RLS fecha a tabela, tudo
-- passa por RPC security definer, e a própria administração vê e resolve.
--
-- Ao contrário da moderação de espécies, aqui a mensagem em si já é o
-- registro/auditoria — não precisa de tabela de log separada.

create table public.support_messages (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  subject     text not null,
  message     text not null,
  status      text not null default 'open' check (status in ('open', 'resolved')),
  admin_reply text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz default now() not null
);

create index support_messages_open_idx on public.support_messages (created_at) where status = 'open';

alter table public.support_messages enable row level security;

create policy "Usuário vê as próprias mensagens, admin vê todas"
  on public.support_messages for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Sem insert/update direto: tudo via RPC abaixo.
revoke insert, update on public.support_messages from authenticated;

create or replace function public.submit_support_message(
  p_subject text,
  p_message text
)
returns public.support_messages
language plpgsql security definer as $$
declare
  _msg public.support_messages;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if coalesce(trim(p_subject), '') = '' or coalesce(trim(p_message), '') = '' then
    raise exception 'Assunto e mensagem são obrigatórios';
  end if;

  insert into public.support_messages (user_id, subject, message)
  values (auth.uid(), trim(p_subject), trim(p_message))
  returning * into _msg;

  insert into public.notifications (user_id, type, title, body, link, support_message_id)
  select p.id, 'support_message',
         'Nova mensagem de suporte',
         _msg.subject,
         '/admin/support', _msg.id
  from public.profiles p
  where p.is_admin;

  return _msg;
end;
$$;

create or replace function public.resolve_support_message(
  p_message_id uuid,
  p_admin_reply text default null
)
returns public.support_messages
language plpgsql security definer as $$
declare
  _msg public.support_messages;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Apenas administradores podem responder mensagens de suporte';
  end if;

  update public.support_messages
  set
    status = 'resolved',
    admin_reply = nullif(trim(coalesce(p_admin_reply, '')), ''),
    resolved_by = auth.uid(),
    resolved_at = now()
  where id = p_message_id
    and status = 'open'
  returning * into _msg;

  if _msg.id is null then
    raise exception 'Mensagem não encontrada ou já respondida';
  end if;

  insert into public.notifications (user_id, type, title, body, link, support_message_id)
  values (
    _msg.user_id, 'support_message_resolved',
    'Sua mensagem foi respondida',
    coalesce(_msg.admin_reply, 'A administração do terreiro tratou sua mensagem.'),
    '/profile/help', _msg.id
  );

  return _msg;
end;
$$;

-- Notifications precisa reconhecer os dois novos tipos e o link para a mensagem de origem.
alter table public.notifications add column support_message_id uuid references public.support_messages(id) on delete cascade;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'species_approved', 'species_rejected', 'species_pending_review',
  'occurrence_verified', 'occurrence_modified_by_admin', 'occurrence_deleted_by_admin',
  'support_message', 'support_message_resolved'
));
