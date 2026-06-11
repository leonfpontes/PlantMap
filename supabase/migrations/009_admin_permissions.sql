-- Atualiza permissões de edição/exclusão de ocorrências
-- Admin (leonfpontes@gmail.com) pode editar e excluir qualquer registro
-- Criadores podem somente editar seus próprios registros (não excluir)

-- Remove políticas antigas de update e delete
drop policy if exists "Usuário edita própria ocorrência" on public.occurrences;
drop policy if exists "Usuário deleta própria ocorrência" on public.occurrences;

-- Update: dono do registro OU admin
create policy "Usuário ou admin edita ocorrência"
  on public.occurrences for update
  using (
    deleted_at is null
    and (
      auth.uid() = user_id
      or auth.jwt() ->> 'email' = 'leonfpontes@gmail.com'
    )
  );

-- Delete: somente admin (soft delete via RPC)
create policy "Admin deleta ocorrência"
  on public.occurrences for delete
  using (auth.jwt() ->> 'email' = 'leonfpontes@gmail.com');

-- Atualiza função de soft delete para permitir admin
create or replace function public.soft_delete_occurrence(occurrence_id uuid)
returns void
language plpgsql security definer as $$
begin
  update public.occurrences
  set deleted_at = now()
  where id = occurrence_id
    and deleted_at is null
    and (
      user_id = auth.uid()
      or auth.jwt() ->> 'email' = 'leonfpontes@gmail.com'
    );

  if not found then
    raise exception 'Ocorrência não encontrada ou sem permissão';
  end if;
end;
$$;
