-- Foto de referência por espécie: distinta da foto de ocorrência (tirada pelo
-- usuário no local). A coluna `species.image_url` já existe desde a migration 001,
-- mas nunca foi usada — nenhuma das 170 espécies do catálogo tem foto hoje.
--
-- Bucket dedicado (em vez de reaproveitar `plant-photos`) porque o storage aqui
-- guarda os arquivos; o RPC `set_species_image` abaixo é quem controla, no banco,
-- se uma URL vira de fato a foto "oficial" de uma espécie aprovada — só admin
-- pode chamá-lo. Um médium sugerindo uma espécie nova continua podendo enviar uma
-- foto junto (via `submit_species`, já aceita `p_image_url` desde a migration 013);
-- como a espécie nasce 'pending' e só fica pública após aprovação, não há
-- necessidade de travar o upload em si, só a associação a uma espécie já aprovada.

insert into storage.buckets (id, name, public)
values ('species-photos', 'species-photos', true)
on conflict (id) do nothing;

create policy "Fotos de espécie visíveis a todos"
  on storage.objects for select
  using (bucket_id = 'species-photos');

create policy "Usuário autenticado faz upload de foto de espécie"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'species-photos');

-- Definir/trocar a foto oficial de uma espécie (inclusive já aprovada) é ação de
-- moderação de catálogo: só admin, via RPC (mesmo padrão de submit_species/review_species).
create or replace function public.set_species_image(
  p_species_id uuid,
  p_image_url text
)
returns public.species
language plpgsql security definer as $$
declare
  _species public.species;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Apenas administradores podem definir a foto de referência da espécie';
  end if;

  update public.species
  set image_url = nullif(trim(coalesce(p_image_url, '')), '')
  where id = p_species_id
  returning * into _species;

  if _species.id is null then
    raise exception 'Espécie não encontrada';
  end if;

  return _species;
end;
$$;
