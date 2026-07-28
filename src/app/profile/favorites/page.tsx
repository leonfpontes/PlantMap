import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Map } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import PlantCard from '@/components/plant/PlantCard'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/server'
import { getFavorites } from '@/lib/actions/profile'
import { PlantOccurrence } from '@/types'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const favorites = await getFavorites(user.id)

  return (
    <MobileShell>
      <PageHeader title="Plantas Favoritas" />

      <div className="flex-1 overflow-y-auto p-4">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Map className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-300">Nenhum favorito ainda</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Explore o mapa e favorite plantas</p>
            <Link href="/map" className="mt-4">
              <Button variant="primary">Explorar mapa</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">{favorites.length} favorito{favorites.length !== 1 ? 's' : ''}</p>
              <Link href="/map">
                <Button variant="secondary" size="sm">
                  <Map className="h-3.5 w-3.5" />
                  Ver no mapa
                </Button>
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {favorites.map((fav) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const occ = (fav as any).occurrences as PlantOccurrence | undefined
                if (!occ) return null
                return <PlantCard key={fav.occurrence_id} occurrence={occ} />
              })}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </MobileShell>
  )
}
