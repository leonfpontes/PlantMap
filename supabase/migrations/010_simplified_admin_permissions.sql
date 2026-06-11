-- Simplifica modelo de permissões:
-- Apenas e-mails da whitelist conseguem autenticar (verificado no auth callback)
-- Todo usuário autenticado é admin: pode editar e excluir qualquer ocorrência

-- Remove políticas da migration 009
drop policy if exists "Usuário ou admin edita ocorrência" on public.occurrences;
drop policy if exists "Admin deleta ocorrência" on public.occurrences;

-- Update: qualquer usuário autenticado pode editar qualquer ocorrência
create policy "Usuário autenticado edita ocorrência"
  on public.occurrences for update
  using (auth.uid() is not null and deleted_at is null);

-- Delete: qualquer usuário autenticado pode deletar qualquer ocorrência
create policy "Usuário autenticado deleta ocorrência"
  on public.occurrences for delete
  using (auth.uid() is not null);

-- Atualiza função de soft delete: apenas requer autenticação
create or replace function public.soft_delete_occurrence(occurrence_id uuid)
returns void
language plpgsql security definer as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  update public.occurrences
  set deleted_at = now()
  where id = occurrence_id
    and deleted_at is null;

  if not found then
    raise exception 'Ocorrência não encontrada';
  end if;
end;
$$;
