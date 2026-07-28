import { redirect } from 'next/navigation'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import SpeciesAdminTabs from '@/components/admin/SpeciesAdminTabs'
import { getProfile } from '@/lib/actions/profile'
import { listPendingSpecies, listApprovedSpeciesCatalog } from '@/lib/actions/species'

export default async function SpeciesModerationPage() {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')
  if (!profile.is_admin) redirect('/profile')

  const [pendingSpecies, catalogSpecies] = await Promise.all([
    listPendingSpecies(),
    listApprovedSpeciesCatalog(),
  ])

  return (
    <MobileShell>
      <PageHeader title="Moderação de Ervas" />

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-4 text-sm text-gray-500">
          Ervas sugeridas pelos médiuns ficam pendentes até aqui. Aprovar libera a espécie para busca
          e cadastro de todos; rejeitar exige um motivo e some da fila. No catálogo, cadastre a foto
          de referência de cada espécie — ela aparece na busca, no mapa e nos cards, distinta da foto
          que cada médium tira da própria ocorrência.
        </p>
        <SpeciesAdminTabs pendingSpecies={pendingSpecies} catalogSpecies={catalogSpecies} />
      </div>

      <BottomNav />
    </MobileShell>
  )
}
