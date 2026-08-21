'use client'

import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import AvatarFrame from '@/components/ui/AvatarFrame'
import { BADGE_TIER_CONFIG, BADGE_TIERS_ORDERED, POINTS_CONFIG } from '@/constants/ranking'

/**
 * Regras do ranking em formato sanfona (mesmo padrão de FaqAccordion), fechada
 * por padrão — antes ficava sempre aberta no topo de /profile/ranking e
 * empurrava a lista pra baixo da dobra.
 *
 * Aberta, ela precisa caber numa tela de celular: com nove molduras, a versão
 * em lista (uma linha por moldura, mais parágrafos explicando cada regra)
 * passava de duas telas de rolagem e o painel virava um documento. Daí as duas
 * escolhas aqui — pontuação como tabela de valor + rótulo curto, e molduras
 * numa grade de três colunas em vez de nove linhas. O texto longo que sobrava
 * virou uma frase só no rodapé.
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
        <div className="px-4 pb-4">
          {/* Pontuação: o valor à esquerda em coluna fixa deixa comparar as
              regras de relance, sem ler três frases inteiras pra achar os
              números. */}
          <dl className="flex flex-col gap-1.5">
            {[
              { valor: `+${POINTS_CONFIG.REGISTER}`, regra: 'Registrar uma ocorrência nova' },
              {
                valor: `+${POINTS_CONFIG.MAINTAIN}`,
                regra: `Cuidar de um registro seu: atualizar condição, estágio, foto ou observações (1× a cada ${POINTS_CONFIG.MAINTAIN_COOLDOWN_DAYS} dias por planta)`,
              },
              { valor: '−', regra: 'Excluir um registro desconta o que ele deu' },
            ].map(({ valor, regra }) => (
              <div key={regra} className="flex gap-2.5">
                <dt className="w-8 flex-shrink-0 text-right text-sm font-semibold tabular-nums text-purple-900 dark:text-purple-200">
                  {valor}
                </dt>
                <dd className="text-xs leading-relaxed text-purple-800 dark:text-purple-300">{regra}</dd>
              </div>
            ))}
          </dl>

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">
            Molduras
          </p>
          <div className="grid grid-cols-3 gap-y-3 sm:grid-cols-5">
            {BADGE_TIERS_ORDERED.map((t) => {
              const tier = BADGE_TIER_CONFIG[t]
              return (
                <div key={t} className="flex flex-col items-center gap-1 text-center">
                  <AvatarFrame tier={t} size="md" />
                  {/* Duas linhas reservadas: "Guardião do Mato" quebra e
                      "Broto" não, e sem a reserva a linha de pontos de cada
                      célula parava numa altura diferente na mesma fileira. */}
                  <p className="flex min-h-[2.1rem] items-start justify-center text-[11px] font-medium leading-tight text-purple-900 dark:text-purple-200">
                    {tier.label}
                  </p>
                  <p className="text-[10px] leading-none text-purple-700 dark:text-purple-400">
                    {tier.minPoints}+
                  </p>
                </div>
              )
            })}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-purple-700 dark:text-purple-400">
            As molduras altas vêm de manter os registros vivos: o cadastro paga uma vez, a manutenção
            paga sempre. É só reconhecimento dentro do terreiro — sem prêmio, e edição feita por
            administrador não pontua.
          </p>
        </div>
      )}
    </div>
  )
}
