# PlantMap

> [!TIP]
> **Novo no projeto?** Acesse o nosso [Guia de Onboarding](file:///E:/Dev/PlantMap/ONBOARDING.md) para entender a arquitetura da stack local e configurar seu ambiente rapidamente!

Plataforma colaborativa para mapeamento de ocorrências de plantas medicinais, rituais e alimentares. Usuários registram localizações no mapa, fotografam e acompanham o estado das plantas ao longo do tempo.

## Funcionalidades

- Mapa interativo com marcadores coloridos por condição da planta
- Registro de ocorrências com foto, espécie, condição e estágio
- Busca por espécie com debounce
- Soft delete de registros (dados preservados no banco)
- Log de auditoria automático para todas as alterações
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

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Desenvolvimento local

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Testes

```bash
npm test          # roda uma vez
npm run test:watch  # modo watch
```

## Deploy

O projeto é publicado automaticamente na Vercel a cada push na branch `master`.
