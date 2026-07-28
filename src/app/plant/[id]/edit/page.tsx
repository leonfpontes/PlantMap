'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import EditForm from '@/components/plant/EditForm'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { PlantOccurrence } from '@/types'
import { parseEWKBPoint } from '@/lib/utils'

export default function EditPlantPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { isAdmin, loading: adminLoading } = useIsAdmin(user?.id || null)
  const [occurrence, setOccurrence] = useState<PlantOccurrence | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('occurrences')
      .select('*, species(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const coords = parseEWKBPoint(data.location)
          if (coords) {
            data.latitude = coords.latitude
            data.longitude = coords.longitude
          }
        }
        setOccurrence(data as unknown as PlantOccurrence)
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (!loading && !userLoading && !adminLoading) {
      // Espelha a regra de RLS do banco: dono do registro OU admin (ver migration 012).
      if (!user || !occurrence || (occurrence.user_id !== user.id && !isAdmin)) {
        router.push('/map')
      }
    }
  }, [user, userLoading, occurrence, loading, isAdmin, adminLoading, router])

  if (loading || userLoading || adminLoading) {
    return (
      <MobileShell>
        <PageHeader title="Carregando..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
        </div>
        <BottomNav />
      </MobileShell>
    )
  }

  if (!occurrence || !user) {
    return null
  }

  return (
    <MobileShell>
      <PageHeader title="Editar Planta" />
      <div className="flex-1 overflow-y-auto p-4">
        <EditForm occurrence={occurrence} />
      </div>
      <BottomNav />
    </MobileShell>
  )
}
