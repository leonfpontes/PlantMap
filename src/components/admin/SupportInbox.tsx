'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { resolveSupportMessage } from '@/lib/actions/support'
import { SupportMessage } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import AdminReviewCard from './AdminReviewCard'

interface SupportInboxProps {
  initialMessages: SupportMessage[]
}

/** Fila de mensagens de suporte para admins: abertas primeiro, resolver com resposta opcional. */
export default function SupportInbox({ initialMessages }: SupportInboxProps) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const open = messages.filter((m) => m.status === 'open')
  const resolved = messages.filter((m) => m.status === 'resolved')

  const handleResolve = async (id: string) => {
    setResolvingId(id)
    setError(null)
    const result = await resolveSupportMessage(id, replyDrafts[id])
    setResolvingId(null)

    if (result.error) {
      setError(result.error)
      return
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: 'resolved', admin_reply: replyDrafts[id] || null, resolved_at: new Date().toISOString() }
          : m
      )
    )
    // A troca acima é o retorno imediato na lista; o refresh é o que atualiza
    // o que vem do servidor — badges do menu admin e fila de /admin.
    router.refresh()
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <CheckCircle2 className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="font-medium text-gray-600 dark:text-gray-300">Nenhuma mensagem de suporte ainda</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {open.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Abertas ({open.length})
          </h2>
          <div className="flex flex-col gap-3">
            {open.map((m) => (
              <AdminReviewCard
                key={m.id}
                avatar={
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                    <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                }
                title={m.subject}
                meta={formatRelativeTime(m.created_at)}
                pills={[{ label: 'Aberta', variant: 'yellow' }]}
                message={m.message}
                footer={
                  <div className="flex flex-col gap-2">
                    <textarea
                      rows={2}
                      placeholder="Resposta (opcional)"
                      value={replyDrafts[m.id] || ''}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      loading={resolvingId === m.id}
                      onClick={() => handleResolve(m.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Marcar como resolvida
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Resolvidas ({resolved.length})
          </h2>
          <div className="flex flex-col gap-3">
            {resolved.map((m) => (
              <AdminReviewCard
                key={m.id}
                dimmed
                avatar={
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <MessageCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </div>
                }
                title={m.subject}
                pills={[{ label: 'Resolvida', variant: 'green' }]}
                message={m.message}
                footer={
                  m.admin_reply ? (
                    <div className="rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400">Sua resposta</p>
                      <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{m.admin_reply}</p>
                    </div>
                  ) : undefined
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
