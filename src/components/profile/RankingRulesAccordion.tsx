'use client'

import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { BADGE_TIER_CONFIG, BADGE_TIERS_ORDERED, POINTS_CONFIG } from '@/constants/ranking'

/**
 * Regras do ranking em formato sanfona (mesmo padrão de FaqAccordion), fechada
 * por padrão — antes ficava sempre aberta no topo de /profile/ranking e
 * empurrava a lista pra baixo da dobra.
 */
export default function RankingRulesAccordion() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-4 rounded-2xl border border-purple-100 bg-purple-50 dark:border-purple-900 dark:bg-purple-900/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <Info className="h-4 w-4 flex-shrink-0 text-purple-900 dark:text-purple-200" />
        <span className="flex-1 text-sm font-semibold text-purple-900 dark:text-purple-200">
          Como funciona o ranking
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 flex-shrink-0 text-purple-700 transition-transform dark:text-purple-400',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 text-sm">
          <ul className="list-disc space-y-1 pl-5 text-purple-800 dark:text-purple-300">
            <li>+{POINTS_CONFIG.REGISTER} pontos ao registrar uma ocorrência nova</li>
            <li>
              +{POINTS_CONFIG.MAINTAIN} pontos ao atualizar condição, estágio, foto ou observações de um
              registro seu — no máximo uma vez a cada {POINTS_CONFIG.MAINTAIN_COOLDOWN_DAYS} dias por
              ocorrência, pra valer por cuidado de verdade, não por salvar de novo sem mudar nada
            </li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {BADGE_TIERS_ORDERED.map((t) => {
              const tier = BADGE_TIER_CONFIG[t]
              return (
                <Badge key={t} variant={tier.variant}>
                  {tier.label} · {tier.minPoints}+
                </Badge>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-purple-700 dark:text-purple-400">
            É só reconhecimento dentro do terreiro — sem prêmio associado, e edições feitas por um
            administrador no seu registro não geram pontos.
          </p>
        </div>
      )}
    </div>
  )
}
