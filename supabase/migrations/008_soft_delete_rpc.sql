-- Função segura para soft delete de ocorrências
-- Usa security definer para evitar problemas de RLS com tokens expirados,
-- mas verifica a propriedade explicitamente dentro da função
create or replace function public.soft_delete_occurrence(occurrence_id uuid)
returns void
language plpgsql security definer as $$
begin
  update public.occurrences
  set deleted_at = now()
  where id = occurrence_id
    and user_id = auth.uid()
    and deleted_at is null;

  if not found then
    raise exception 'Ocorrência não encontrada ou sem permissão';
  end if;
end;
$$;
