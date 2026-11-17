import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Leaf } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import PlantCard from '@/components/plant/PlantCard'
import { createClient } from '@/lib/supabase/server'
import { listMyOccurrences } from '@/lib/actions/plants'

export default async function MyPlantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const plants = await listMyOccurrences()

  return (
    <MobileShell>
      <PageHeader title="Meus registros" />
      <div className="flex-1 overflow-y-auto p-4">
        {plants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Leaf className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="font-medium text-gray-700 dark:text-gray-200">Você ainda não registrou nenhuma planta</p>
            <Link href="/plant/register" className="mt-3 text-sm font-semibold text-green-700 hover:underline dark:text-green-400">
              Registrar a primeira
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              {plants.length} planta{plants.length !== 1 ? 's' : ''} registrada{plants.length !== 1 ? 's' : ''} por você
            </p>
            <div className="flex flex-col gap-3">
              {plants.map((p) => <PlantCard key={p.id} occurrence={p} />)}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </MobileShell>
  )
}
