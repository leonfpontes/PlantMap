-- Criar bucket plant-photos se não existir
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

-- Políticas de storage para o bucket plant-photos
create policy "Fotos visíveis a todos"
  on storage.objects for select
  using (bucket_id = 'plant-photos');

create policy "Usuário autenticado faz upload de foto"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'plant-photos');

create policy "Usuário deleta própria foto"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'plant-photos' and auth.uid()::text = (storage.foldername(name))[1]);
