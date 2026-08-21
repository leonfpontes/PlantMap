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
/** Folha menor, pra intercalar entre as grandes sem empastar o anel. */
const SMALL_LEAF_PATH = 'M50 5 C54.5 7 55 12 50 15.5 C45 12 45.5 7 50 5 Z'
/** Raiz/gavinha fina, mesma convenção de posição nativa no topo. */
const ROOT_PATH = 'M50 2 C45 7 45 12 50 17'
/** Faísca de quatro pontas — o ornamento que não é planta, exclusivo do último tier. */
const SPARK_PATH = 'M50 2.5 L51.5 7.5 L56.5 9 L51.5 10.5 L50 15.5 L48.5 10.5 L43.5 9 L48.5 7.5 Z'

/** Mandala fechada de 12 posições, e a mesma girada meio passo pra intercalar. */
const RING_12 = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
const RING_12_OFFSET = RING_12.map((a) => a + 15)

interface TierStyle {
  /** Cor sólida do anel. Ignorada quando `gradient` está presente. */
  stroke?: string
  width: number
  dash?: string
  gradient?: string[]
  outerRing?: boolean
  glow?: boolean
  pulse?: boolean
  leaves?: number[]
  smallLeaves?: number[]
  berries?: number[]
  sparks?: number[]
  roots?: number[]
}

/**
 * Uma moldura por tier de ranking (ver constants/ranking.ts e migration 029),
 * pensada como progressão de ciclo de vida da planta — não só troca de cor.
 *
 * Faixa de entrada (0–600), a planta se estabelecendo:
 *   sementeira → anel pontilhado, sem ornamento (potencial, ainda dormente)
 *   broto      → anel fino + brotinho no topo (12h), rompendo a superfície
 *   raiz       → anel + gavinhas na base (6h), crescendo pra baixo
 *   guardião   → anel mais grosso + coroa de folhas no topo, arco largo
 *   ancestral  → anel em gradiente roxo→dourado + mandala de folhas + brilho
 *
 * Faixa alta (1200+), acrescentada no rebalanceamento — a planta virando mata.
 * O sinal de "estou acima do Ancestral" é estrutural, não cromático: todas
 * ganham um segundo anel externo, e cada uma acrescenta uma camada nova de
 * ornamento sobre a mandala, então dá pra ordenar as quatro de relance mesmo
 * sem lembrar qual cor é qual:
 *   tronco     → anel duplo teal→lima + coroa de folhas E gavinhas (copa e raiz)
 *   copa       → anel duplo esmeralda→sol + mandala cheia + frutos intercalados
 *   mata       → anel duplo índigo→esmeralda + mandala em duas camadas + brilho
 *   encantado  → anel duplo iridescente + mandala + faíscas + brilho pulsante
 *
 * Substitui a badge solta como indicador de tier em contextos onde a foto
 * do usuário já aparece (ranking, cabeçalho do perfil) — a moldura é o sinal
 * visual principal; o nome do tier continua disponível como texto (label)
 * pra quem não capta o código de cor/ornamento.
 */
const TIER_STYLE: Record<BadgeTier, TierStyle> = {
  sementeira: { stroke: '#9ca3af', width: 2, dash: '3 4' },
  broto: { stroke: '#22c55e', width: 2.5, leaves: [-18, 0, 18] },
  raiz: { stroke: '#2563eb', width: 3, roots: [150, 165, 180, 195, 210] },
  guardiao: { stroke: '#ca8a04', width: 3.5, leaves: [-72, -48, -24, 0, 24, 48, 72] },
  ancestral: { gradient: ['#9333ea', '#f59e0b'], width: 4, glow: true, leaves: RING_12 },
  tronco: {
    gradient: ['#b45309', '#4d7c0f'],
    width: 3.5,
    outerRing: true,
    leaves: [-72, -48, -24, 0, 24, 48, 72],
    roots: [150, 165, 180, 195, 210],
  },
  copa: {
    gradient: ['#15803d', '#eab308'],
    width: 4,
    outerRing: true,
    leaves: RING_12,
    berries: RING_12_OFFSET,
  },
  mata: {
    gradient: ['#4f46e5', '#10b981'],
    width: 4,
    outerRing: true,
    glow: true,
    leaves: RING_12,
    smallLeaves: RING_12_OFFSET,
  },
  encantado: {
    gradient: ['#7c3aed', '#db2777', '#06b6d4', '#f59e0b'],
    width: 4.5,
    outerRing: true,
    glow: true,
    pulse: true,
    leaves: RING_12,
    sparks: RING_12_OFFSET,
  },
}

export default function AvatarFrame({ src, name, tier, size = 'md', className }: AvatarFrameProps) {
  const gradientId = useId()
  const glowId = useId()

  const avatarPx = AVATAR_PX[size]
  const boxPx = Math.round(avatarPx * BLEED)
  const style = TIER_STYLE[tier]
  const label = BADGE_TIER_CONFIG[tier].label

  // Gradiente em userSpaceOnUse (e não no bounding box de cada forma): assim a
  // folha lá no topo e a folha lá embaixo pegam pontos diferentes da rampa,
  // em vez de cada uma repetir o gradiente inteiro dentro de si.
  const paint = style.gradient ? `url(#${gradientId})` : style.stroke

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
        <defs>
          {/* O gradiente vai de (15,15) a (85,85), não de canto a canto do viewBox:
              a moldura é um anel, não um disco, então os cantos ficam vazios e uma
              rampa de 0 a 100 gastaria as duas pontas em pixel nenhum — as cores
              extremas simplesmente não apareciam. */}
          {style.gradient && (
            <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="15" y1="15" x2="85" y2="85">
              {style.gradient.map((color, i) => (
                <stop
                  key={color}
                  offset={`${(i / (style.gradient!.length - 1)) * 100}%`}
                  stopColor={color}
                />
              ))}
            </linearGradient>
          )}
          {style.glow && (
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          )}
        </defs>

        {style.glow && (
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={paint}
            strokeWidth="5"
            opacity="0.55"
            filter={`url(#${glowId})`}
            className={style.pulse ? 'motion-safe:animate-pulse' : undefined}
          />
        )}

        {style.outerRing && (
          <circle cx="50" cy="50" r="46.5" fill="none" stroke={paint} strokeWidth="1.6" opacity="0.7" />
        )}

        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke={paint}
          strokeWidth={style.width}
          strokeDasharray={style.dash}
          strokeLinecap="round"
        />

        {style.leaves?.map((angle) => (
          <g key={`leaf-${angle}`} transform={`rotate(${angle} 50 50)`}>
            <path d={LEAF_PATH} fill={paint} />
            <path d={LEAF_VEIN} stroke="black" strokeOpacity={0.22} strokeWidth={0.8} />
          </g>
        ))}

        {style.smallLeaves?.map((angle) => (
          <path
            key={`small-${angle}`}
            d={SMALL_LEAF_PATH}
            fill={paint}
            opacity="0.7"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}

        {style.berries?.map((angle) => (
          <circle
            key={`berry-${angle}`}
            cx="50"
            cy="9"
            r="2.4"
            fill={paint}
            transform={`rotate(${angle} 50 50)`}
          />
        ))}

        {style.sparks?.map((angle) => (
          <path
            key={`spark-${angle}`}
            d={SPARK_PATH}
            fill={paint}
            opacity="0.85"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}

        {style.roots?.map((angle) => (
          <path
            key={`root-${angle}`}
            d={ROOT_PATH}
            fill="none"
            stroke={paint}
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </svg>
    </span>
  )
}
