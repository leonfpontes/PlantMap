'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Heart, Share2, CheckCircle, Leaf, MapPin, Calendar, Edit, Trash2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ShareSheet from '@/components/plant/ShareSheet'
import SpeciesAvatar from '@/components/plant/SpeciesAvatar'
import ImageLightbox from '@/components/plant/ImageLightbox'
import BottomSheet from '@/components/ui/BottomSheet'
import { deleteOccurrence } from '@/lib/actions/plants'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useFavorites } from '@/hooks/useFavorites'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { PlantOccurrence } from '@/types'
import { parseEWKBPoint } from '@/lib/utils'
import { CONDITION_CONFIG, STAGE_LABEL, ORIGIN_LABEL } from '@/constants/plant'

const PlantMap = dynamic(() => import('@/components/map/PlantMap'), { ssr: false })

export default function PlantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useUser()
  const { favorites, toggle } = useFavorites(user?.id || null)
  const { isAdmin } = useIsAdmin(user?.id || null)
  const [occurrence, setOccurrence] = useState<PlantOccurrence | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  if (loading) {
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

  if (!occurrence) {
    return (
      <MobileShell>
        <PageHeader title="Não encontrado" />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Ocorrência não encontrada
        </div>
        <BottomNav />
      </MobileShell>
    )
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteOccurrence(occurrence.id)
    if (result?.error) {
      setDeleting(false)
      setConfirmDelete(false)
    } else {
      window.location.href = '/map'
    }
  }

  // Espelha a regra de RLS do banco: dono do registro OU admin (ver migration 012).
  const canEdit = !!user && (user.id === occurrence.user_id || isAdmin)
  const canDelete = canEdit

  const condition = CONDITION_CONFIG[occurrence.condition] ?? CONDITION_CONFIG.healthy
  const isFav = favorites.has(occurrence.id)

  return (
    <MobileShell>
      <PageHeader
        title={occurrence.species?.common_name || 'Planta'}
        right={
          <div className="flex items-center gap-1">
            {canEdit && (
              <Link
                href={`/plant/${occurrence.id}/edit`}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              >
                <Edit className="h-5 w-5" />
              </Link>
            )}
            <button
              onClick={() => toggle(occurrence.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <Heart className={`h-5 w-5 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* Mini map */}
        <div className="h-48 w-full">
          <PlantMap
            occurrences={[occurrence]}
            initialLat={occurrence.latitude}
            initialLng={occurrence.longitude}
            initialZoom={15}
          />
        </div>

        {/* Photo */}
        {occurrence.photo_url && (
          <button onClick={() => setPhotoOpen(true)} className="w-full block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={occurrence.photo_url} alt="Foto da planta" className="w-full h-48 object-cover" />
          </button>
        )}

        <div className="p-4 flex flex-col gap-4">
          {/* Header info */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                {occurrence.species?.image_url ? (
                  <ImageLightbox
                    src={occurrence.species.image_url}
                    alt={occurrence.species.common_name}
                    className="flex-shrink-0 cursor-zoom-in"
                  >
                    <SpeciesAvatar imageUrl={occurrence.species.image_url} alt={occurrence.species.common_name} size={48} />
                  </ImageLightbox>
                ) : (
                  <SpeciesAvatar imageUrl={null} alt={occurrence.species?.common_name || 'Espécie'} size={48} />
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{occurrence.species?.common_name}</h2>
                  <p className="text-sm italic text-gray-500">{occurrence.species?.scientific_name}</p>
                </div>
              </div>
              {occurrence.verified && (
                <div className="flex items-center gap-1 text-blue-600 text-xs font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Verificado
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={condition.variant}>{condition.label}</Badge>
            <Badge variant="gray">{STAGE_LABEL[occurrence.stage] ?? occurrence.stage}</Badge>
            {occurrence.species?.origin && (
              <Badge variant="blue">{ORIGIN_LABEL[occurrence.species.origin] ?? occurrence.species.origin}</Badge>
            )}
            {occurrence.species?.family && (
              <Badge variant="gray">{occurrence.species.family}</Badge>
            )}
          </div>

          {/* Details */}
          <div className="rounded-2xl bg-gray-50 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-gray-600">
                {occurrence.latitude.toFixed(5)}, {occurrence.longitude.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-gray-600">
                {new Date(occurrence.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', year: 'numeric'
                })}
              </span>
            </div>
            {occurrence.species?.description && (
              <div className="flex items-start gap-2 text-sm">
                <Leaf className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-600">{occurrence.species.description}</p>
              </div>
            )}
          </div>

          {occurrence.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Observações</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{occurrence.notes}</p>
            </div>
          )}

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>

          {canDelete && (
            <Button
              variant="secondary"
              className="w-full !text-red-600 !border-red-200 hover:!bg-red-50"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              Excluir registro
            </Button>
          )}
        </div>
      </div>

      <BottomNav />

      <BottomSheet
        title="Excluir registro?"
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
      >
        <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita. O registro será removido do mapa.</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button
            className="flex-1 !bg-red-600 hover:!bg-red-700"
            loading={deleting}
            onClick={handleDelete}
          >
            Excluir
          </Button>
        </div>
      </BottomSheet>

      {photoOpen && occurrence.photo_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setPhotoOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={occurrence.photo_url}
            alt="Foto da planta"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}

      {shareOpen && (
        <ShareSheet
          occurrenceId={occurrence.id}
          latitude={occurrence.latitude}
          longitude={occurrence.longitude}
          onClose={() => setShareOpen(false)}
        />
      )}
    </MobileShell>
  )
}
