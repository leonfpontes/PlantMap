'use client'

import Image from 'next/image'
import { Marker } from 'react-map-gl/maplibre'
import { Check, Leaf } from 'lucide-react'
import { PlantOccurrence } from '@/types'
import { CONDITION_CONFIG, CONDITION_PIN_CLASS, CONDITION_RING } from '@/constants/plant'
import { cn } from '@/lib/utils'

interface PlantPinProps {
  occurrence: PlantOccurrence
  onClick: (occurrence: PlantOccurrence) => void
  selected?: boolean
  /** Realce vindo de fora (ex.: hover na lista da tela desktop), somado ao `selected` por clique. */
  highlighted?: boolean
  onHover?: (hovering: boolean) => void
  /**
   * `dot` é a versão de longe: um ponto, barato de desenhar aos montes.
   * `medallion` é a de perto, com a foto da espécie. Quem decide é o zoom,
   * em PlantMap — ver MEDALLION_ZOOM.
   */
  variant?: 'dot' | 'medallion'
}

/**
 * Geometria do medalhão, num viewBox de 100 x 128.
 *
 * O corpo é um círculo e o bico é um triângulo cuja aresta de cima fica
 * enfiada dentro do círculo — as duas formas brancas se fundem numa gota só.
 * O bico não é enfeite: sem ele o medalhão flutua e não dá pra dizer que metro
 * do mapa ele marca, então ele precisa sobrar bem abaixo da borda do círculo.
 */
const MEDALLION_PX = 46
const VIEWBOX_H = 128
const CY = 50
/** Raio da foto. */
const PHOTO_R = 38
/** Raio do aro de condição, desenhado por cima da borda da foto. */
const RING_R = 41
/** Raio da base branca, a moldura que separa o pin do mapa. */
const BASE_R = 47
/** Ponta do bico. A base do círculo fica em CY + BASE_R = 97. */
const TIP_Y = 124

const SCALE = MEDALLION_PX / 100
const PHOTO_PX = PHOTO_R * 2 * SCALE
const PHOTO_OFFSET = (50 - PHOTO_R) * SCALE
const TAIL = `M36 84 L64 84 L50 ${TIP_Y} Z`

export default function PlantPin({
  occurrence,
  onClick,
  selected,
  highlighted,
  onHover,
  variant = 'medallion',
}: PlantPinProps) {
  const destacado = selected || highlighted
  const condicao = CONDITION_CONFIG[occurrence.condition] ?? CONDITION_CONFIG.healthy
  const aro = CONDITION_RING[occurrence.condition] ?? CONDITION_RING.healthy
  const morta = occurrence.condition === 'dead'

  // Foto de referência da espécie primeiro: o pin existe pra responder "que
  // erva é essa", e a foto do catálogo é a que representa a espécie. A foto
  // que o médium tirou da própria ocorrência entra como segunda opção, e o
  // ícone genérico só quando não há nenhuma das duas.
  const foto = occurrence.species?.image_url ?? occurrence.photo_url ?? null
  const nome = occurrence.species?.common_name ?? 'Planta'
  const rotulo = `${nome} — ${condicao.label}${occurrence.verified ? ', verificada' : ''}`

  return (
    <Marker
      longitude={occurrence.longitude}
      latitude={occurrence.latitude}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation()
        onClick(occurrence)
      }}
    >
      <div
        className="cursor-pointer"
        role="button"
        aria-label={rotulo}
        title={rotulo}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
      >
        {variant === 'dot' ? (
          <>
            <div
              className={cn(
                'h-3.5 w-3.5 rounded-full border-2 shadow-md transition-transform',
                CONDITION_PIN_CLASS[occurrence.condition] ?? CONDITION_PIN_CLASS.healthy,
                destacado && 'scale-150 shadow-lg'
              )}
            />
            <div className={cn('mx-auto h-1.5 w-0.5', morta ? 'bg-gray-400' : 'bg-green-700')} />
          </>
        ) : (
          <div
            className={cn(
              'relative origin-bottom transition-transform duration-150',
              destacado && 'scale-125'
            )}
            style={{ width: MEDALLION_PX, height: MEDALLION_PX * (VIEWBOX_H / 100) }}
          >
            {/* Três camadas, e não um SVG só, porque a foto no meio precisa
                passar pelo otimizador do Next: as fotos do catálogo são
                originais de banco de imagem (algumas com milhares de pixels de
                largura) e um <image> de SVG baixaria o arquivo inteiro pra
                desenhar 46 pixels — vezes o número de pins na tela. */}
            <svg
              viewBox={`0 0 100 ${VIEWBOX_H}`}
              className="absolute inset-0 h-full w-full drop-shadow-md"
              aria-hidden="true"
            >
              {/* Preenchimento primeiro nas duas formas, contorno depois: assim
                  a linha do círculo não cruza o bico por dentro da junção. */}
              <path d={TAIL} fill="#fff" />
              <circle cx="50" cy={CY} r={BASE_R} fill="#fff" />
              <path d={TAIL} fill="#fff" stroke="rgba(0,0,0,0.10)" strokeWidth="1" />
              <circle cx="50" cy={CY} r={BASE_R} fill="#fff" stroke="rgba(0,0,0,0.10)" strokeWidth="1" />
            </svg>

            <div
              className="absolute overflow-hidden rounded-full bg-green-100"
              style={{ left: PHOTO_OFFSET, top: PHOTO_OFFSET, width: PHOTO_PX, height: PHOTO_PX }}
            >
              {foto ? (
                <Image
                  src={foto}
                  alt=""
                  // 2× o tamanho de tela, pra não borrar em tela retina.
                  width={Math.round(PHOTO_PX * 2)}
                  height={Math.round(PHOTO_PX * 2)}
                  className="h-full w-full object-cover"
                  // Planta morta esmaece em vez de sumir do mapa: continua
                  // registrada e clicável, mas para de competir com as vivas.
                  style={morta ? { opacity: 0.4 } : undefined}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <Leaf className="h-1/2 w-1/2 text-green-600" aria-hidden="true" />
                </span>
              )}
            </div>

            <svg
              viewBox={`0 0 100 ${VIEWBOX_H}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy={CY}
                r={RING_R}
                fill="none"
                stroke={aro.color}
                strokeWidth={aro.width}
                strokeDasharray={aro.dash}
                strokeLinecap="round"
              />
            </svg>

            {occurrence.verified && (
              <span
                className="absolute flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 ring-2 ring-white"
                style={{ right: 0, top: MEDALLION_PX - 18 }}
                aria-hidden="true"
              >
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
              </span>
            )}
          </div>
        )}
      </div>
    </Marker>
  )
}
