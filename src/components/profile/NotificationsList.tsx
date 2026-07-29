'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Sprout, PenLine, Trash2, BellRing, MessageCircle, UserCheck } from 'lucide-react'
import { AppNotification, NotificationType } from '@/types'
import { markAllNotificationsRead, markNotificationRead } from '@/lib/actions/notifications'
import Button from '@/components/ui/Button'
import { cn, formatRelativeTime } from '@/lib/utils'

interface NotificationsListProps {
  initialNotifications: AppNotification[]
}

const TYPE_CONFIG: Record<NotificationType, { icon: typeof BellRing; bg: string; color: string }> = {
  species_approved: { icon: CheckCircle2, bg: 'bg-green-50 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400' },
  species_rejected: { icon: XCircle, bg: 'bg-red-50 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
  species_pending_review: { icon: Sprout, bg: 'bg-yellow-50 dark:bg-yellow-900/30', color: 'text-yellow-600 dark:text-yellow-400' },
  occurrence_verified: { icon: CheckCircle2, bg: 'bg-blue-50 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
  occurrence_modified_by_admin: { icon: PenLine, bg: 'bg-gray-100 dark:bg-gray-800', color: 'text-gray-600 dark:text-gray-300' },
  occurrence_deleted_by_admin: { icon: Trash2, bg: 'bg-red-50 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
  support_message: { icon: MessageCircle, bg: 'bg-blue-50 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
  support_message_resolved: { icon: MessageCircle, bg: 'bg-green-50 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400' },
  registration_requested: { icon: UserCheck, bg: 'bg-teal-50 dark:bg-teal-900/30', color: 'text-teal-600 dark:text-teal-400' },
  registration_approved: { icon: UserCheck, bg: 'bg-green-50 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400' },
  registration_rejected: { icon: XCircle, bg: 'bg-red-50 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
}

/**
 * Central de notificações. Ler = marca como lida (otimista) e navega pro
 * link relacionado (erva sugerida, registro verificado etc.).
 */
export default function NotificationsList({ initialNotifications }: NotificationsListProps) {
  const [items, setItems] = useState(initialNotifications)
  const router = useRouter()

  const unreadCount = items.filter((n) => !n.read_at).length

  const handleOpen = (n: AppNotification) => {
    if (!n.read_at) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)))
      markNotificationRead(n.id)
    }
    if (n.link) router.push(n.link)
  }

  const handleMarkAll = () => {
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })))
    markAllNotificationsRead()
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <BellRing className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="font-medium text-gray-600 dark:text-gray-300">Nenhuma notificação ainda</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          Você é avisado quando uma erva sua for revisada ou um registro seu for verificado
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {unreadCount > 0 && (
        <Button variant="ghost" size="sm" className="self-end" onClick={handleMarkAll}>
          Marcar todas como lidas
        </Button>
      )}

      <div className="flex flex-col gap-2">
        {items.map((n) => {
          const config = TYPE_CONFIG[n.type]
          const Icon = config.icon
          const unread = !n.read_at

          return (
            <button
              key={n.id}
              type="button"
              onClick={() => handleOpen(n)}
              className={cn(
                'flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors',
                unread
                  ? 'border-green-200 bg-green-50/60 hover:bg-green-50 dark:border-green-900 dark:bg-green-900/10 dark:hover:bg-green-900/20'
                  : 'border-gray-100 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800'
              )}
            >
              <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full', config.bg)}>
                <Icon className={cn('h-5 w-5', config.color)} />
              </div>

              <div className="min-w-0 flex-1">
                <p className={cn(
                  'text-sm',
                  unread ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'
                )}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.body}</p>
                )}
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{formatRelativeTime(n.created_at)}</p>
              </div>

              {unread && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-green-600 dark:bg-green-400" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
