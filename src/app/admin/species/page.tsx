import SpeciesAdminTabs from '@/components/admin/SpeciesAdminTabs'
import { listPendingSpecies, listAllSpeciesAdmin } from '@/lib/actions/species'

export default async function SpeciesModerationPage() {
  const [pendingSpecies, catalogSpecies] = await Promise.all([
    listPendingSpecies(),
    listAllSpeciesAdmin(),
  ])

  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Administração</p>
      <h1 className="mb-2 font-serif text-2xl text-gray-900 dark:text-gray-100">Ervas sugeridas pelos médiuns</h1>
      <p className="mb-6 max-w-prose text-sm text-gray-500 dark:text-gray-400">
        Aprovar libera a espécie para busca e cadastro de todos; rejeitar exige um motivo e some da fila.
        No catálogo, cadastre, edite ou exclua qualquer espécie diretamente e defina a foto de referência
        de cada uma — ela aparece na busca, no mapa e nos cards, distinta da foto que cada médium tira da
        própria ocorrência.
      </p>
      <SpeciesAdminTabs pendingSpecies={pendingSpecies} catalogSpecies={catalogSpecies} />
    </div>
  )
}
