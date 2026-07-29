'use client'

import { useState } from 'react'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { requestOccurrencePermission } from '@/lib/actions/permissions'
import { PermissionRequest } from '@/types'
import { PERMISSION_REQUEST_STATUS_CONFIG } from '@/constants/plant'
import { formatRelativeTime } from '@/lib/utils'

interface PermissionRequestFormProps {
  canRegister: boolean
  initialRequests: PermissionRequest[]
}

/** Status + formulário de pedido de permissão para registrar ocorrências no mapa. */
export default function PermissionRequestForm({ canRegister, initialRequests }: PermissionRequestFormProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasPending = requests.some((r) => r.status === 'pending')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)

    const result = await requestOccurrencePermission(message)
    setSending(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setRequests((prev) => [
      {
        id: crypto.randomUUID(),
        user_id: '',
        message: message || null,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ])
    setMessage('')
  }

  if (canRegister) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-green-100 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-900/20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
          <ShieldCheck className="h-7 w-7 text-green-700 dark:text-green-400" />
        </div>
        <p className="font-medium text-green-800 dark:text-green-300">Você já pode registrar novas ocorrências</p>
        <p className="text-sm text-green-700/80 dark:text-green-400/80">
          Use o botão &quot;Registrar&quot; para marcar uma planta no mapa a qualquer momento.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {hasPending ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-yellow-100 bg-yellow-50 p-6 text-center dark:border-yellow-900 dark:bg-yellow-900/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40">
            <ShieldAlert className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
          </div>
          <p className="font-medium text-yellow-800 dark:text-yellow-300">Seu pedido está em análise</p>
          <p className="text-sm text-yellow-700/80 dark:text-yellow-400/80">
            A administração do terreiro vai revisar em breve — você recebe uma notificação assim que houver resposta.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Para manter a qualidade do catálogo, novos registros de localização dependem de aprovação. Conte um pouco sobre por que você quer registrar plantas (opcional).
          </p>
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Ex.: sou médium do terreiro e quero ajudar a mapear as ervas do jardim..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" loading={sending} className="w-full">
            Pedir permissão para registrar
          </Button>
        </form>
      )}

      {requests.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Seus pedidos</h2>
          {requests.map((r) => {
            const status = PERMISSION_REQUEST_STATUS_CONFIG[r.status]
            return (
              <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(r.created_at)}</span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                {r.message && <p className="text-sm text-gray-600 dark:text-gray-300">{r.message}</p>}
                {r.status === 'rejected' && r.rejection_reason && (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    Motivo: {r.rejection_reason}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
