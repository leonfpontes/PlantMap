'use client'

import { useState } from 'react'
import { Check, X, ShieldCheck } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { reviewPermissionRequest, setRegistrationPermission } from '@/lib/actions/permissions'
import { AdminUserRow } from '@/types'

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
  const [users, setUsers] = useState(initialUsers)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateUser = (userId: string, patch: Partial<AdminUserRow>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)))
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

        return (
          <div key={u.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <Avatar src={u.avatar_url} name={u.full_name || u.email} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900 dark:text-gray-100">{u.full_name || 'Sem nome'}</p>
                <p className="truncate text-xs text-gray-400 dark:text-gray-500">{u.email}</p>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                {u.is_admin && <Badge variant="blue">Admin</Badge>}
                {u.can_register_occurrences ? (
                  <Badge variant="green">Pode registrar</Badge>
                ) : isPending ? (
                  <Badge variant="yellow">Pedido em análise</Badge>
                ) : u.latest_request?.status === 'rejected' ? (
                  <Badge variant="red">Recusado</Badge>
                ) : (
                  <Badge variant="gray">Não solicitado</Badge>
                )}
              </div>
            </div>

            {u.latest_request?.message && (
              <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                &quot;{u.latest_request.message}&quot;
              </p>
            )}

            {isPending ? (
              rejectingId === u.id ? (
                <div className="mt-3 flex flex-col gap-2">
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
                <div className="mt-3 flex gap-2">
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
              <div className="mt-3">
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
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
