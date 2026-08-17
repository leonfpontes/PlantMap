'use client'

import AvatarFrame from '@/components/ui/AvatarFrame'
import { BADGE_TIER_CONFIG } from '@/constants/ranking'
import type { OccurrenceRegistrant } from '@/types'

interface RegistrantCardProps {
  registrant: OccurrenceRegistrant
  /** Marca o card quando quem está vendo a tela é o próprio autor do registro. */
  isMe?: boolean
}

/**
 * Crédito de autoria na tela de detalhe da ocorrência: foto com a moldura do
 * tier + nome, no mesmo formato do cabeçalho do perfil e das linhas do ranking
 * (ver AvatarFrame e migration 023) — quem registrou é reconhecido pelo mesmo
 * sinal visual em toda a aplicação.
 *
 * Conta excluída vira "Usuário removido": a anonimização da migration 019 zera
 * nome e foto, e sem isso o card apareceria com o nome em branco.
 */
export default function RegistrantCard({ registrant, isMe }: RegistrantCardProps) {
  const name = registrant.deleted
    ? 'Usuário removido'
    : registrant.full_name || 'Usuário'
  const tierLabel = BADGE_TIER_CONFIG[registrant.tier].label

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
      <AvatarFrame
        src={registrant.deleted ? null : registrant.avatar_url}
        name={registrant.deleted ? null : registrant.full_name}
        tier={registrant.tier}
        size="lg"
      />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Registrado por
        </p>
        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
          {name}
          {isMe && <span className="ml-1.5 text-sm font-normal text-gray-400 dark:text-gray-500">(você)</span>}
        </p>
        {!registrant.deleted && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tierLabel} · {registrant.points} ponto{registrant.points === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </div>
  )
}
