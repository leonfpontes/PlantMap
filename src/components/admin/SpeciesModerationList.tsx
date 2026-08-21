'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Leaf } from 'lucide-react'
import { reviewSpecies, SpeciesModerationItem } from '@/lib/actions/species'
import { ORIGIN_LABEL } from '@/constants/plant'
import Button from '@/components/ui/Button'
import AdminReviewCard from './AdminReviewCard'

interface SpeciesModerationListProps {
  initialSpecies: SpeciesModerationItem[]
}

/**
 * Fila de moderação de ervas sugeridas pelos usuários. Aprovar/rejeitar chama
 * a RPC `review_species` (migration 013), que já garante no banco que só
 * admins conseguem revisar — esta lista só existe para dar a eles uma UI.
 */
export default function SpeciesModerationList({ initialSpecies }: SpeciesModerationListProps) {
  const router = useRouter()
  const [items, setItems] = useState(initialSpecies)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async (id: string) => {
    setBusyId(id)
    setError(null)
    const result = await reviewSpecies(id, true)
    if (result.error) setError(result.error)
    else {
      setItems((prev) => prev.filter((s) => s.id !== id))
      // A remoção acima é só o retorno imediato na lista. O refresh é o que
      // atualiza o que é renderizado no servidor — o "(N)" da aba Pendentes,
      // os badges do menu admin e a triagem de /admin — que antes só saíam do
      // número antigo com um reload manual.
      router.refresh()
    }
    setBusyId(null)
  }

  const handleReject = async (id: string) => {
    if (!reason.trim()) { setError('Informe o motivo da rejeição'); return }
    setBusyId(id)
    setError(null)
    const result = await reviewSpecies(id, false, reason)
    if (result.error) setError(result.error)
    else {
      setItems((prev) => prev.filter((s) => s.id !== id))
      setRejectingId(null)
      setReason('')
      router.refresh()
    }
    setBusyId(null)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
          <Leaf className="h-8 w-8 text-green-500 dark:text-green-400" />
        </div>
        <p className="font-medium text-gray-600 dark:text-gray-300">Nenhuma erva pendente</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Sugestões de novas espécies aparecem aqui</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}

      {items.map((sp) => (
        <AdminReviewCard
          key={sp.id}
          avatar={
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
              <Leaf className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          }
          title={sp.common_name}
          subtitle={sp.scientific_name || undefined}
          pills={[{ label: ORIGIN_LABEL[sp.origin], variant: 'gray' }]}
          tags={sp.family ? [sp.family] : undefined}
          message={sp.description || undefined}
          footer={
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Sugerido por {sp.submitter?.full_name || sp.submitter?.email || 'usuário removido'}
              </p>
              {rejectingId === sp.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Motivo da rejeição (obrigatório)"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setRejectingId(null); setReason(''); setError(null) }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      loading={busyId === sp.id}
                      onClick={() => handleReject(sp.id)}
                    >
                      Confirmar rejeição
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    disabled={busyId !== null}
                    onClick={() => { setRejectingId(sp.id); setReason(''); setError(null) }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Rejeitar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    loading={busyId === sp.id}
                    disabled={busyId !== null && busyId !== sp.id}
                    onClick={() => handleApprove(sp.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Aprovar
                  </Button>
                </div>
              )}
            </div>
          }
        />
      ))}
    </div>
  )
}
