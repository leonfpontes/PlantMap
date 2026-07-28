import { redirect } from 'next/navigation'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import SpeciesModerationList from '@/components/admin/SpeciesModerationList'
import { getProfile } from '@/lib/actions/profile'
import { listPendingSpecies } from '@/lib/actions/species'

export default async function SpeciesModerationPage() {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')
  if (!profile.is_admin) redirect('/profile')

  const pendingSpecies = await listPendingSpecies()

  return (
    <MobileShell>
      <PageHeader title="Moderação de Ervas" />

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-4 text-sm text-gray-500">
          Ervas sugeridas pelos médiuns ficam pendentes até aqui. Aprovar libera a espécie para busca
          e cadastro de todos; rejeitar exige um motivo e some da fila.
        </p>
        <SpeciesModerationList initialSpecies={pendingSpecies} />
      </div>

      <BottomNav />
    </MobileShell>
  )
}
