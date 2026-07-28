'use client'

import { useState } from 'react'
import { Check, X, Leaf } from 'lucide-react'
import { reviewSpecies, SpeciesModerationItem } from '@/lib/actions/species'
import { ORIGIN_LABEL } from '@/constants/plant'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface SpeciesModerationListProps {
  initialSpecies: SpeciesModerationItem[]
}

/**
 * Fila de moderação de ervas sugeridas pelos usuários. Aprovar/rejeitar chama
 * a RPC `review_species` (migration 013), que já garante no banco que só
 * admins conseguem revisar — esta lista só existe para dar a eles uma UI.
 */
export default function SpeciesModerationList({ initialSpecies }: SpeciesModerationListProps) {
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
    else setItems((prev) => prev.filter((s) => s.id !== id))
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
    }
    setBusyId(null)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <Leaf className="h-8 w-8 text-green-500" />
        </div>
        <p className="font-medium text-gray-600">Nenhuma erva pendente</p>
        <p className="mt-1 text-sm text-gray-400">Sugestões de novas espécies aparecem aqui</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {items.map((sp) => (
        <div key={sp.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{sp.common_name}</p>
              {sp.scientific_name && (
                <p className="text-xs italic text-gray-500">{sp.scientific_name}</p>
              )}
            </div>
            <Badge variant="gray">{ORIGIN_LABEL[sp.origin]}</Badge>
          </div>

          {sp.family && <p className="mt-1 text-xs text-gray-500">Família: {sp.family}</p>}
          {sp.description && <p className="mt-2 text-sm text-gray-600">{sp.description}</p>}

          <p className="mt-2 text-xs text-gray-400">
            Sugerido por {sp.submitter?.full_name || sp.submitter?.email || 'usuário removido'}
          </p>

          {rejectingId === sp.id ? (
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Motivo da rejeição (obrigatório)"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
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
            <div className="mt-3 flex gap-2">
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
      ))}
    </div>
  )
}
