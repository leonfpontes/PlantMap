# PlantMap

> [!TIP]
> **Novo no projeto?** Acesse o nosso [Guia de Onboarding](./ONBOARDING.md) para entender a arquitetura da stack local e configurar seu ambiente rapidamente!

Plataforma colaborativa para mapeamento de ocorrências de plantas medicinais, rituais e alimentares. Usuários registram localizações no mapa, fotografam e acompanham o estado das plantas ao longo do tempo.

## Funcionalidades

- Mapa interativo com marcadores coloridos por condição da planta
- Registro de ocorrências com foto, espécie, condição e estágio
- Busca por espécie com debounce e sem depender de acentuação — "guine" acha "Guiné" (ver [migration 025](supabase/migrations/025_accent_insensitive_search.sql))
- Sugestão de novas espécies pelos usuários, com fila de moderação para admins (ver [Moderação de espécies](#moderação-de-espécies))
- Soft delete de registros (dados preservados no banco)
- Log de auditoria automático para todas as alterações (ocorrências e espécies)
- Favoritos por usuário
- Compartilhamento de ocorrência via link
- Autenticação exclusiva via Google OAuth
- Interface responsiva com bottom navigation adaptada para visitantes e usuários autenticados

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Banco de dados | Supabase (PostgreSQL + PostGIS) |
| Autenticação | Supabase Auth (Google OAuth / PKCE) |
| Storage | Supabase Storage |
| Mapa | MapLibre GL / react-map-gl |
| Estilização | Tailwind CSS v4 |
| Formulários | react-hook-form + Zod v4 |
| Testes | Vitest + Testing Library |

## Estrutura do projeto

```
src/
  app/              # Páginas (App Router)
  components/
    layout/         # MobileShell, BottomNav, PageHeader
    map/            # PlantMap, PlantPin, PlantTooltip
    plant/          # PlantCard, RegisterForm, EditForm, ShareSheet
    ui/             # Badge, Button, Input, BottomSheet
  constants/
    plant.ts        # Configs centralizadas de condição, estágio e origem
  hooks/
    useUser.ts
    useFavorites.ts
    useSpeciesSearch.ts   # Busca com debounce
    usePhotoUpload.ts     # Upload para Supabase Storage
  lib/
    actions/        # Server Actions (plants, auth)
    supabase/       # Clients SSR e browser
    utils.ts
  test/             # Testes unitários (Vitest)
  types/            # Tipos TypeScript globais
supabase/
  migrations/       # Histórico de migrations SQL
```

## Variáveis de ambiente

Copie [.env.example](.env.example) para `.env.local` e preencha os valores:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

## Permissões

O login (Google OAuth) é aberto a qualquer conta — não há mais whitelist de e-mails. O que é
restrito é a capacidade de **registrar novas ocorrências** no mapa: cada `profiles` tem uma flag
`can_register_occurrences` (`false` por padrão para contas novas). Um usuário sem essa permissão
pede acesso em `/profile/permission`; um admin aprova ou rejeita em `/admin/users` (RPCs
`request_occurrence_permission` / `review_occurrence_permission_request`, nunca insert/update
direto — ver [migration 021](supabase/migrations/021_registration_permission.sql)). Um admin também
pode conceder ou revogar essa permissão diretamente, sem pedido, pela mesma tela.

Ocorrências só podem ser editadas/excluídas pelo próprio dono ou por um usuário com
`is_admin = true` em `profiles` (ver [migration 012](supabase/migrations/012_ownership_based_permissions.sql)).
A flag `is_admin` só pode ser alterada com acesso direto ao banco (não é exposta pela API).

### Moderação de espécies

O catálogo de espécies (`species`) não é editável livremente: qualquer usuário autenticado pode
**sugerir** uma espécie nova (nome popular, científico se souber, família, origem, descrição), mas
ela nasce com `status = 'pending'` e só fica visível para quem sugeriu — a busca geral só a exibe
depois que um admin aprova. Rejeições exigem um motivo. Todo o fluxo passa pelas RPCs
`submit_species` / `review_species` (nunca por insert/update direto na tabela) e é auditado em
`species_audit_log`, no mesmo padrão do log de ocorrências (ver
[migration 013](supabase/migrations/013_species_moderation.sql)).

- Sugerir uma espécie: botão "Sugerir nova erva" na busca de espécie do formulário de registro/edição.
- Acompanhar minhas sugestões: `/profile/species`.
- Moderar (aprovar/rejeitar) sugestões pendentes: `/admin/species`, visível no menu de perfil apenas
  para usuários com `is_admin = true`.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Qualidade de código

```bash
npm run lint         # ESLint
npm test             # Vitest, roda uma vez
npm run test:watch   # Vitest, modo watch
```

O workflow em [.github/workflows/ci.yml](.github/workflows/ci.yml) roda lint, testes e build em cada push/PR para `master`.

## Deploy

O projeto é publicado automaticamente na Vercel a cada push na branch `master`.
