'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Eye, SearchX } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import { reportOccurrence } from '@/lib/actions/reports'
import { CONDITION_CHOICES } from '@/constants/plant'
import { daysSince, formatSeenAgo } from '@/lib/careMissions'
import type { PlantCondition, ReportResult } from '@/types'
import { cn } from '@/lib/utils'

interface VisitReportProps {
  occurrenceId: string
  lastSeenAt: string | null | undefined
  goneReports: number | undefined
  loggedIn: boolean
  /** Chamado depois de um relato aceito, pra tela recarregar o registro. */
  onReported?: () => void
}

type Etapa = 'pergunta' | 'condicao' | 'pronto'

/**
 * "Visitei": qualquer pessoa logada conta se a planta ainda está lá e como
 * está. É o que mantém o mapa vivo sem depender só de quem cadastrou —
 * e vale 10 pontos (1x por planta a cada 7 dias, regra no banco).
 */
export default function VisitReport({ occurrenceId, lastSeenAt, goneReports, loggedIn, onReported }: VisitReportProps) {
  const [open, setOpen] = useState(false)
  const [etapa, setEtapa] = useState<Etapa>('pergunta')
  const [condicao, setCondicao] = useState<PlantCondition | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ status: 'present' | 'gone'; data: ReportResult } | null>(null)

  const vista = formatSeenAgo(daysSince(lastSeenAt))
  const sumiu = goneReports ?? 0

  const abrir = () => {
    setEtapa('pergunta')
    setCondicao(null)
    setErro(null)
    setResultado(null)
    setOpen(true)
  }

  const enviar = async (status: 'present' | 'gone') => {
    setEnviando(true)
    setErro(null)
    const { result, error } = await reportOccurrence(occurrenceId, status, condicao ?? undefined)
    setEnviando(false)
    if (error || !result) {
      setErro(error ?? 'Não foi possível enviar. Tente de novo.')
      return
    }
    setResultado({ status, data: result })
    setEtapa('pronto')
    onReported?.()
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
          <Eye className="h-5 w-5 text-green-700 dark:text-green-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {vista ? vista.charAt(0).toUpperCase() + vista.slice(1) : 'Ainda sem visitas'}
          </p>
          {sumiu > 0 ? (
            <p className="mt-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              {sumiu} {sumiu === 1 ? 'pessoa não encontrou' : 'pessoas não encontraram'} a planta recentemente
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Passou por ela? Conte como ela está e ganhe pontos.
            </p>
          )}
        </div>
      </div>

      {loggedIn ? (
        <button
          type="button"
          onClick={abrir}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-green-700 text-sm font-semibold text-green-700 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-900/30"
        >
          Estive aqui
        </button>
      ) : (
        <Link
          href="/auth/login"
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Entre para contar se ela ainda está aqui
        </Link>
      )}

      <BottomSheet title="Você passou por esta planta" open={open} onClose={() => setOpen(false)}>
        {etapa === 'pergunta' && (
          <div className="flex flex-col gap-2">
            <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">Ela ainda está no lugar?</p>
            <button
              type="button"
              onClick={() => setEtapa('condicao')}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-gray-200 px-4 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              Sim, está aqui
            </button>
            <button
              type="button"
              onClick={() => enviar('gone')}
              disabled={enviando}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-gray-200 px-4 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              <SearchX className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              {enviando ? 'Enviando...' : 'Não encontrei'}
            </button>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Quando 3 pessoas diferentes não encontram a planta, a administração revisa o registro.
            </p>
          </div>
        )}

        {etapa === 'condicao' && (
          <div>
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">Como ela está?</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Condição da planta">
              {CONDITION_CHOICES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={condicao === o.value}
                  onClick={() => setCondicao(o.value)}
                  className={cn(
                    'flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors',
                    condicao === o.value
                      ? 'border-green-700 bg-green-50 text-green-800 dark:border-green-500 dark:bg-green-900/30 dark:text-green-300'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: o.color }} aria-hidden="true" />
                  {o.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => enviar('present')}
              disabled={!condicao || enviando}
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
            >
              {enviando ? 'Enviando...' : 'Enviar'}
            </button>
            <button
              type="button"
              onClick={() => setEtapa('pergunta')}
              className="mt-2 w-full text-center text-xs font-medium text-gray-500 hover:underline dark:text-gray-400"
            >
              Voltar
            </button>
          </div>
        )}

        {etapa === 'pronto' && resultado && (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            <p className="font-semibold text-gray-900 dark:text-gray-100">Obrigado por cuidar do mapa!</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {resultado.data.points_awarded > 0
                ? `Você ganhou ${resultado.data.points_awarded} pontos.`
                : 'Seu relato foi salvo. Os pontos desta planta voltam a contar daqui a alguns dias.'}
            </p>
            {resultado.status === 'gone' && resultado.data.flagged && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Com este relato, a administração vai revisar se a planta deve sair do mapa.
              </p>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 min-h-11 w-full rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              Fechar
            </button>
          </div>
        )}

        {erro && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{erro}</p>
        )}
      </BottomSheet>
    </div>
  )
}
