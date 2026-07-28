-- Preferências de Aparência (tema e tamanho de texto), persistidas por conta
-- para acompanhar o usuário entre aparelhos. Mesmo padrão de column-level grant
-- da migration 010: a API só pode alterar as colunas explicitamente liberadas.

alter table public.profiles
  add column theme_preference text not null default 'system'
    check (theme_preference in ('light', 'dark', 'system')),
  add column font_scale text not null default 'normal'
    check (font_scale in ('normal', 'large', 'xlarge'));

grant update (full_name, avatar_url, theme_preference, font_scale) on public.profiles to authenticated;
