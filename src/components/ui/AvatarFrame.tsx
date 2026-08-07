'use client'

import { useId } from 'react'
import Avatar from './Avatar'
import { BADGE_TIER_CONFIG } from '@/constants/ranking'
import type { BadgeTier } from '@/types'
import { cn } from '@/lib/utils'

interface AvatarFrameProps {
  src?: string | null
  name?: string | null
  tier: BadgeTier
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const AVATAR_PX: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
}

/** Quanto a moldura decorativa "sangra" para fora da foto, em proporção do tamanho do avatar. */
const BLEED = 1.32

/** Folha, desenhada "nativa" no topo do viewBox 100x100 — rotaciona pra qualquer posição no anel. */
const LEAF_PATH = 'M50 1 C57 4 58 12 50 17 C42 12 43 4 50 1 Z'
/** Nervura central da folha, mesma convenção de posição. */
const LEAF_VEIN = 'M50 3 L50 15'
/** Raiz/gavinha fina, mesma convenção de posição nativa no topo. */
const ROOT_PATH = 'M50 2 C45 7 45 12 50 17'

const LEAF_ANGLES: Partial<Record<BadgeTier, number[]>> = {
  broto: [-18, 0, 18],
  guardiao: [-72, -48, -24, 0, 24, 48, 72],
  ancestral: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
}

const ROOT_ANGLES: Partial<Record<BadgeTier, number[]>> = {
  raiz: [150, 165, 180, 195, 210],
}

/**
 * Moldura decorativa em volta da foto do usuário, uma por tier de ranking
 * (ver migration 023 / constants/ranking.ts) — pensada como uma progressão
 * de ciclo de vida da planta, não só uma troca de cor:
 *
 *   sementeira → anel pontilhado, sem ornamento (potencial, ainda dormente)
 *   broto      → anel fino + brotinho no topo (12h), rompendo a superfície
 *   raiz       → anel + gavinhas na base (6h), crescendo pra baixo
 *   guardião   → anel mais grosso + coroa de folhas no topo, arco largo
 *   ancestral  → anel em gradiente roxo→dourado + mandala completa de folhas + brilho
 *
 * Substitui a badge solta como indicador de tier em contextos onde a foto
 * do usuário já aparece (ranking, cabeçalho do perfil) — a moldura é o sinal
 * visual principal; o nome do tier continua disponível como texto (label)
 * pra quem não capta o código de cor/ornamento.
 */
export default function AvatarFrame({ src, name, tier, size = 'md', className }: AvatarFrameProps) {
  const gradientId = useId()
  const glowId = useId()

  const avatarPx = AVATAR_PX[size]
  const boxPx = Math.round(avatarPx * BLEED)
  const leafAngles = LEAF_ANGLES[tier] ?? []
  const rootAngles = ROOT_ANGLES[tier] ?? []
  const isAncestral = tier === 'ancestral'
  const label = BADGE_TIER_CONFIG[tier].label

  const ringProps = {
    sementeira: { stroke: '#9ca3af', width: 2, dash: '3 4' },
    broto: { stroke: '#22c55e', width: 2.5 },
    raiz: { stroke: '#2563eb', width: 3 },
    guardiao: { stroke: '#ca8a04', width: 3.5 },
    ancestral: { stroke: `url(#${gradientId})`, width: 4 },
  }[tier]

  return (
    <span
      role="img"
      aria-label={`Foto de ${name || 'usuário'} — tier ${label}`}
      title={label}
      className={cn('relative inline-flex flex-shrink-0', className)}
      style={{ width: avatarPx, height: avatarPx }}
    >
      <Avatar src={src} name={name} size={size} />

      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: boxPx, height: boxPx }}
      >
        {isAncestral && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>
        )}

        {isAncestral && (
          <circle cx="50" cy="50" r="45" fill="none" stroke={`url(#${gradientId})`} strokeWidth="5" opacity="0.55" filter={`url(#${glowId})`} />
        )}

        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke={ringProps.stroke}
          strokeWidth={ringProps.width}
          strokeDasharray={'dash' in ringProps ? ringProps.dash : undefined}
          strokeLinecap="round"
        />

        {leafAngles.map((angle) => (
          <g key={angle} transform={`rotate(${angle} 50 50)`}>
            <path d={LEAF_PATH} fill={ringProps.stroke} />
            <path d={LEAF_VEIN} stroke="black" strokeOpacity={0.22} strokeWidth={0.8} />
          </g>
        ))}

        {rootAngles.map((angle) => (
          <g key={angle} transform={`rotate(${angle} 50 50)`}>
            <path d={ROOT_PATH} fill="none" stroke={ringProps.stroke} strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}
      </svg>
    </span>
  )
}
