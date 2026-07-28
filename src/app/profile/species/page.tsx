import { redirect } from 'next/navigation'
import { Sprout } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import Badge from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/server'
import { listMySpeciesSubmissions } from '@/lib/actions/species'
import { ORIGIN_LABEL, SPECIES_STATUS_CONFIG } from '@/constants/plant'

export default async function MySpeciesSubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const submissions = await listMySpeciesSubmissions()

  return (
    <MobileShell>
      <PageHeader title="Ervas que sugeri" />

      <div className="flex-1 overflow-y-auto p-4">
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-900/30">
              <Sprout className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-300">Você ainda não sugeriu nenhuma erva</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Ao registrar uma ocorrência, use &quot;Sugerir nova erva&quot; se não encontrar a espécie
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {submissions.map((sp) => {
              const status = SPECIES_STATUS_CONFIG[sp.status]
              return (
                <div key={sp.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{sp.common_name}</p>
                      {sp.scientific_name && (
                        <p className="text-xs italic text-gray-500 dark:text-gray-400">{sp.scientific_name}</p>
                      )}
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Origem: {ORIGIN_LABEL[sp.origin]}</p>
                  {sp.status === 'rejected' && sp.rejection_reason && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                      Motivo: {sp.rejection_reason}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </MobileShell>
  )
}
