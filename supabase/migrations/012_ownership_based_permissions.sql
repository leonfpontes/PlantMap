-- Corrige o modelo de permissões introduzido pela migration 010, que deixava
-- QUALQUER usuário autenticado editar ou excluir ocorrências de outras pessoas.
--
-- Restaura o modelo de propriedade (dono edita/exclui o próprio registro) e
-- reintroduz administradores — mas, ao invés de checar um e-mail fixo embutido
-- no SQL (como fazia a migration 009, exigindo alterar e reaplicar migration
-- para trocar o admin), usa uma flag `is_admin` em `profiles`.

-- Flag de administrador. Só pode ser alterada com acesso direto ao banco
-- (service_role/console), nunca pelo próprio usuário via API — ver REVOKE/GRANT abaixo.
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- A policy de update em profiles ("Usuário edita próprio perfil") permite que o
-- dono atualize a própria linha, mas sem restrição de coluna isso deixaria
-- qualquer usuário se autopromover a admin (update({ is_admin: true })).
-- O GRANT column-level abaixo fecha essa brecha: a API só pode alterar
-- full_name e avatar_url, nunca is_admin.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- Remove as políticas permissivas demais da migration 010
drop policy if exists "Usuário autenticado edita ocorrência" on public.occurrences;
drop policy if exists "Usuário autenticado deleta ocorrência" on public.occurrences;

-- Update: dono do registro OU admin
create policy "Usuário ou admin edita ocorrência"
  on public.occurrences for update
  using (
    deleted_at is null
    and (
      auth.uid() = user_id
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )
  );

-- Delete: dono do registro OU admin
create policy "Usuário ou admin deleta ocorrência"
  on public.occurrences for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Atualiza a função de soft delete: dono OU admin (mesma regra da policy de delete)
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
    and deleted_at is null
    and (
      user_id = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    );

  if not found then
    raise exception 'Ocorrência não encontrada ou sem permissão';
  end if;
end;
$$;
