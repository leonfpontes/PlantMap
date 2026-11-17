import GoneQueue from '@/components/admin/GoneQueue'
import { listGoneFlagged } from '@/lib/actions/reports'

export default async function GonePlantsPage() {
  const items = await listGoneFlagged()

  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Administração</p>
      <h1 className="mb-2 font-serif text-2xl text-gray-900 dark:text-gray-100">Plantas que sumiram</h1>
      <p className="mb-6 max-w-prose text-sm text-gray-500 dark:text-gray-400">
        Plantas que 3 ou mais pessoas diferentes não encontraram no lugar. Arquivar tira do mapa sem
        tirar os pontos de ninguém; manter zera a contagem, como se alguém tivesse visto a planta.
      </p>
      <GoneQueue initialItems={items} />
    </div>
  )
}
