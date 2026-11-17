'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Archive, Leaf, SearchX, Sparkles } from 'lucide-react'
import AdminReviewCard from '@/components/admin/AdminReviewCard'
import Button from '@/components/ui/Button'
import { resolveGoneFlag, type GoneFlaggedItem } from '@/lib/actions/reports'
import { daysSince, formatSeenAgo } from '@/lib/careMissions'
import { formatRelativeTime } from '@/lib/utils'

export default function GoneQueue({ initialItems }: { initialItems: GoneFlaggedItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const decide = async (id: string, action: 'archive' | 'keep') => {
    setBusy(id)
    setError(null)
    const result = await resolveGoneFlag(id, action)
    setBusy(null)
    if (result.error) { setError(result.error); return }
    setItems((list) => list.filter((i) => i.id !== id))
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
          <Sparkles className="h-8 w-8 text-green-500 dark:text-green-400" />
        </div>
        <p className="font-medium text-gray-600 dark:text-gray-300">Nenhuma planta marcada como sumida</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
      )}
      {items.map((item) => {
        const vista = formatSeenAgo(daysSince(item.last_seen_at))
        return (
          <AdminReviewCard
            key={item.id}
            avatar={
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
                <Leaf className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            }
            title={item.species?.common_name ?? 'Planta'}
            subtitle={item.species?.scientific_name ?? undefined}
            meta={formatRelativeTime(item.gone_flagged_at)}
            pills={[{ label: `${item.gone_reports} não encontraram`, variant: 'red' }]}
            message={[
              vista ? `Última confirmação: ${vista}.` : null,
              ...item.reports.map((r) =>
                `${r.status === 'gone' ? 'Não encontrou' : 'Viu a planta'} — ${r.reporter ?? 'usuário removido'}, ${formatRelativeTime(r.created_at)}`
              ),
            ].filter(Boolean).join('\n')}
            footer={
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="danger" loading={busy === item.id} onClick={() => decide(item.id, 'archive')}>
                  <Archive className="h-4 w-4" />
                  Arquivar
                </Button>
                <Button size="sm" variant="secondary" disabled={busy === item.id} onClick={() => decide(item.id, 'keep')}>
                  <SearchX className="h-4 w-4" />
                  Manter no mapa
                </Button>
                <Link href={`/plant/${item.id}`} className="ml-auto text-xs font-medium text-green-700 hover:underline dark:text-green-400">
                  Ver registro →
                </Link>
              </div>
            }
          />
        )
      })}
    </div>
  )
}
