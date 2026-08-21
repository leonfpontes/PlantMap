'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ShieldCheck } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { reviewPermissionRequest, setRegistrationPermission } from '@/lib/actions/permissions'
import { AdminUserRow } from '@/types'
import AdminReviewCard from './AdminReviewCard'

interface AdminUsersListProps {
  initialUsers: AdminUserRow[]
}

/**
 * Todos os usuários já cadastrados, com quem pode registrar ocorrências no
 * mapa e quem ainda não. Pedidos pendentes (occurrence_permission_requests)
 * aparecem com aprovar/rejeitar; fora isso, dá pra conceder ou revogar a
 * permissão direto, sem esperar um pedido — mesmo padrão de review_species.
 */
export default function AdminUsersList({ initialUsers }: AdminUsersListProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // A alteração local é o retorno imediato na lista; o refresh é o que
  // atualiza o que vem do servidor — badges do menu admin e fila de /admin.
  const updateUser = (userId: string, patch: Partial<AdminUserRow>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)))
    router.refresh()
  }

  const handleApprove = async (u: AdminUserRow) => {
    if (!u.latest_request) return
    setBusyId(u.id)
    setError(null)
    const result = await reviewPermissionRequest(u.latest_request.id, true)
    setBusyId(null)
    if (result.error) { setError(result.error); return }
    updateUser(u.id, {
      can_register_occurrences: true,
      latest_request: { ...u.latest_request, status: 'approved' },
    })
  }

  const handleReject = async (u: AdminUserRow) => {
    if (!u.latest_request) return
    if (!reason.trim()) { setError('Informe o motivo da rejeição'); return }
    setBusyId(u.id)
    setError(null)
    const result = await reviewPermissionRequest(u.latest_request.id, false, reason)
    setBusyId(null)
    if (result.error) { setError(result.error); return }
    updateUser(u.id, {
      latest_request: { ...u.latest_request, status: 'rejected', rejection_reason: reason },
    })
    setRejectingId(null)
    setReason('')
  }

  const handleSetPermission = async (u: AdminUserRow, allowed: boolean) => {
    setBusyId(u.id)
    setError(null)
    const result = await setRegistrationPermission(u.id, allowed)
    setBusyId(null)
    if (result.error) { setError(result.error); return }
    updateUser(u.id, { can_register_occurrences: allowed })
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}

      {users.map((u) => {
        const isPending = u.latest_request?.status === 'pending'
        const pills: { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue' }[] = []
        if (u.is_admin) pills.push({ label: 'Admin', variant: 'blue' })
        if (u.can_register_occurrences) pills.push({ label: 'Pode registrar', variant: 'green' })
        else if (isPending) pills.push({ label: 'Pedido em análise', variant: 'yellow' })
        else if (u.latest_request?.status === 'rejected') pills.push({ label: 'Recusado', variant: 'red' })
        else pills.push({ label: 'Não solicitado', variant: 'gray' })

        return (
          <AdminReviewCard
            key={u.id}
            avatar={<Avatar src={u.avatar_url} name={u.full_name || u.email} size="md" />}
            title={u.full_name || 'Sem nome'}
            subtitle={u.email}
            pills={pills}
            message={u.latest_request?.message ? `"${u.latest_request.message}"` : undefined}
            footer={
              isPending ? (
                rejectingId === u.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      placeholder="Motivo da rejeição (obrigatório)"
                      className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setRejectingId(null); setReason(''); setError(null) }}>
                        Cancelar
                      </Button>
                      <Button variant="danger" size="sm" className="flex-1" loading={busyId === u.id} onClick={() => handleReject(u)}>
                        Confirmar rejeição
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" className="flex-1" disabled={busyId !== null} onClick={() => { setRejectingId(u.id); setReason(''); setError(null) }}>
                      <X className="h-3.5 w-3.5" />
                      Rejeitar
                    </Button>
                    <Button variant="primary" size="sm" className="flex-1" loading={busyId === u.id} disabled={busyId !== null && busyId !== u.id} onClick={() => handleApprove(u)}>
                      <Check className="h-3.5 w-3.5" />
                      Aprovar
                    </Button>
                  </div>
                )
              ) : (
                <>
                  {u.can_register_occurrences ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full !text-red-600 !border-red-200 hover:!bg-red-50 dark:!text-red-400 dark:!border-red-900 dark:hover:!bg-red-900/20"
                      loading={busyId === u.id}
                      onClick={() => handleSetPermission(u, false)}
                    >
                      Revogar permissão
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      loading={busyId === u.id}
                      onClick={() => handleSetPermission(u, true)}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Conceder permissão
                    </Button>
                  )}
                </>
              )
            }
          />
        )
      })}
    </div>
  )
}
