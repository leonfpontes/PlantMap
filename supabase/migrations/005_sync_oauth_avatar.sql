-- Sincroniza avatar_url do perfil sempre que o usuário fizer login via OAuth
create or replace function public.handle_user_updated()
returns trigger language plpgsql security definer as $$
declare
  new_avatar text;
begin
  new_avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  if new_avatar is not null then
    update public.profiles
    set avatar_url = new_avatar
    where id = new.id and (avatar_url is null or avatar_url != new_avatar);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_updated();
