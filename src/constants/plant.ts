/**
 * Configurações centralizadas de entidades de planta.
 * Único ponto de verdade para labels, variantes e opções
 * usadas em formulários, cards e badges em toda a aplicação.
 */

import type { PlantCondition, PlantStage, SpeciesStatus, PermissionRequestStatus } from '@/types'

/** Variante de badge mapeada para cada condição de planta. */
export const CONDITION_CONFIG: Record<
  PlantCondition,
  { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }
> = {
  healthy: { label: 'Saudável', variant: 'green' },
  fair:    { label: 'Regular',  variant: 'yellow' },
  poor:    { label: 'Ruim',     variant: 'red' },
  dead:    { label: 'Morta',    variant: 'gray' },
}

/** Cor do pin no mapa por condição (hex, usada em SVG/inline style). */
export const CONDITION_PIN_COLOR: Record<PlantCondition, string> = {
  healthy: '#16a34a',
  fair:    '#ca8a04',
  poor:    '#dc2626',
  dead:    '#6b7280',
}

/** Classes Tailwind para o círculo do marcador no mapa. */
export const CONDITION_PIN_CLASS: Record<PlantCondition, string> = {
  healthy: 'bg-green-500 border-green-700',
  fair:    'bg-yellow-400 border-yellow-600',
  poor:    'bg-red-500 border-red-700',
  dead:    'bg-gray-400 border-gray-600',
}

/** Label de exibição por estágio de desenvolvimento. */
export const STAGE_LABEL: Record<PlantStage, string> = {
  seedling: 'Muda',
  juvenile: 'Jovem',
  adult:    'Adulta',
  unknown:  'Desconhecido',
}

/** Label de exibição por origem botânica. */
export const ORIGIN_LABEL: Record<string, string> = {
  native:      'Nativa',
  exotic:      'Exótica',
  naturalized: 'Naturalizada',
}

/** Opções de seleção para o campo condition nos formulários. */
export const CONDITION_OPTIONS: { value: PlantCondition; label: string }[] = [
  { value: 'healthy', label: 'Saudável' },
  { value: 'fair',    label: 'Regular'  },
  { value: 'poor',    label: 'Ruim'     },
  { value: 'dead',    label: 'Morta'    },
]

/** Opções de seleção para o campo stage nos formulários. */
export const STAGE_OPTIONS: { value: PlantStage; label: string }[] = [
  { value: 'adult',    label: 'Adulta'       },
  { value: 'juvenile', label: 'Jovem'        },
  { value: 'seedling', label: 'Muda'         },
  { value: 'unknown',  label: 'Desconhecido' },
]

/** Variante de badge e label para cada status de moderação de uma espécie sugerida. */
export const SPECIES_STATUS_CONFIG: Record<
  SpeciesStatus,
  { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }
> = {
  pending:  { label: 'Aguardando aprovação', variant: 'yellow' },
  approved: { label: 'Aprovada',             variant: 'green' },
  rejected: { label: 'Rejeitada',            variant: 'red' },
}

/** Variante de badge e label para cada status de pedido de permissão de registro. */
export const PERMISSION_REQUEST_STATUS_CONFIG: Record<
  PermissionRequestStatus,
  { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }
> = {
  pending:  { label: 'Em análise', variant: 'yellow' },
  approved: { label: 'Aprovado',   variant: 'green' },
  rejected: { label: 'Recusado',   variant: 'red' },
}
