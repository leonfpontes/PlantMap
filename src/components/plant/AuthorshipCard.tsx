'use client'

import AvatarFrame from '@/components/ui/AvatarFrame'
import { BADGE_TIER_CONFIG } from '@/constants/ranking'
import type { OccurrenceCredit } from '@/types'

interface AuthorshipCardProps {
  credit: OccurrenceCredit
  /** Marca o card quando quem está vendo a tela é a própria pessoa creditada. */
  isMe?: boolean
}

/**
 * Crédito da tela de detalhe da ocorrência: foto com a moldura do tier + nome,
 * no mesmo formato do cabeçalho do perfil e das linhas do ranking (ver
 * AvatarFrame e migration 023) — quem cuida do registro é reconhecido pelo mesmo
 * sinal visual em toda a aplicação.
 *
 * "Atualizado por" só aparece quando quem editou é outra pessoa que não o dono
 * (ver getOccurrence); o dono mexendo na própria planta continua como
 * "Registrado por". A data da edição vem junto do rótulo — a do registro não,
 * porque já está logo abaixo, na lista de detalhes.
 *
 * Conta excluída vira "Usuário removido": a anonimização da migration 019 zera
 * nome e foto, e sem isso o card apareceria com o nome em branco.
 */
export default function AuthorshipCard({ credit, isMe }: AuthorshipCardProps) {
  const name = credit.deleted ? 'Usuário removido' : credit.full_name || 'Usuário'
  const tierLabel = BADGE_TIER_CONFIG[credit.tier].label
  // Data curta (17/08/2026) porque o rótulo é caixa alta com tracking: por
  // extenso, "Atualizado por · 17 de agosto de 2026" quebra em duas linhas no
  // celular. A data por extenso do registro continua na lista de detalhes.
  const label =
    credit.kind === 'updated'
      ? `Atualizado por · ${new Date(credit.at).toLocaleDateString('pt-BR')}`
      : 'Registrado por'

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
      <AvatarFrame
        src={credit.deleted ? null : credit.avatar_url}
        name={credit.deleted ? null : credit.full_name}
        tier={credit.tier}
        size="lg"
      />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {label}
        </p>
        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
          {name}
          {isMe && <span className="ml-1.5 text-sm font-normal text-gray-400 dark:text-gray-500">(você)</span>}
        </p>
        {!credit.deleted && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tierLabel} · {credit.points} ponto{credit.points === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </div>
  )
}
