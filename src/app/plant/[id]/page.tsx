'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Share2, CheckCircle, Leaf, MapPin, Calendar, Edit, Trash2, BookOpen } from 'lucide-react'
import dynamic from 'next/dynamic'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import Button from '@/components/ui/Button'
import ShareSheet from '@/components/plant/ShareSheet'
import DirectionsButton from '@/components/plant/DirectionsButton'
import VisitReport from '@/components/plant/VisitReport'
import SpeciesAvatar from '@/components/plant/SpeciesAvatar'
import AuthorshipCard from '@/components/plant/AuthorshipCard'
import ImageLightbox from '@/components/plant/ImageLightbox'
import BottomSheet from '@/components/ui/BottomSheet'
import { deleteOccurrence, getOccurrence } from '@/lib/actions/plants'
import { setFlash } from '@/lib/flash'
import { useUser } from '@/hooks/useUser'
import { useFavorites } from '@/hooks/useFavorites'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { PlantOccurrence } from '@/types'
import { CONDITION_CONFIG, STAGE_LABEL, ORIGIN_LABEL, CONDITION_PIN_COLOR } from '@/constants/plant'
import { cn } from '@/lib/utils'
import { imageUrl } from '@/lib/imageLoader'

// Card mais largo que o padrão 'comfortable' — mapa e foto lado a lado
// precisam de mais espaço do que a coluna estreita das outras telas.
const DESKTOP_WIDTH_CLASS = 'lg:max-w-4xl'

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
    getOccurrence(id).then((data) => {
      setOccurrence(data)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <MobileShell className={DESKTOP_WIDTH_CLASS}>
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
      <MobileShell className={DESKTOP_WIDTH_CLASS}>
        <PageHeader title="Não encontrado" />
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
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
      setFlash('Registro excluído')
      window.location.href = '/map'
    }
  }

  // Espelha a regra de RLS do banco: dono do registro OU admin (ver migration 012).
  const canEdit = !!user && (user.id === occurrence.user_id || isAdmin)
  const canDelete = canEdit

  const condition = CONDITION_CONFIG[occurrence.condition] ?? CONDITION_CONFIG.healthy
  const isFav = favorites.has(occurrence.id)

  return (
    <MobileShell className={DESKTOP_WIDTH_CLASS}>
      <PageHeader
        title={occurrence.species?.common_name || 'Planta'}
        right={
          <div className="flex items-center gap-1">
            {canEdit && (
              <Link
                href={`/plant/${occurrence.id}/edit`}
                aria-label="Editar registro"
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 dark:hover:bg-gray-800 dark:text-gray-400"
              >
                <Edit className="h-5 w-5" />
              </Link>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* Mapa + foto: lado a lado e bem maiores no desktop, empilhados no celular */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:p-4 lg:pb-0">
          <div
            className={cn(
              'h-48 w-full lg:order-2 lg:h-80 lg:overflow-hidden lg:rounded-2xl',
              !occurrence.photo_url && 'lg:col-span-2'
            )}
          >
            <PlantMap
              occurrences={[occurrence]}
              initialLat={occurrence.latitude}
              initialLng={occurrence.longitude}
              initialZoom={15}
            />
          </div>

          {occurrence.photo_url && (
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              aria-label="Ver foto em tela cheia"
              className="w-full block lg:order-1 lg:h-80 lg:overflow-hidden lg:rounded-2xl"
            >
              {/* Passa pelo otimizador: fotos antigas subiram em tamanho
                  original (vários MB) e baixá-las inteiras pra uma faixa de
                  192 px pesava no 3G. A foto cheia continua no visualizador. */}
              <Image
                src={occurrence.photo_url}
                alt="Foto da planta"
                width={860}
                height={320}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="h-48 w-full object-cover lg:h-80"
              />
            </button>
          )}
        </div>

        <div className="p-4 flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:p-6">
          {/* Header info */}
          <div className="lg:col-span-2">
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
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{occurrence.species?.common_name}</h2>
                  <p className="text-sm italic text-gray-500 dark:text-gray-400">{occurrence.species?.scientific_name}</p>
                  {/* Ficha da erva: para que serve, orixás, uso ritual e cuidados. */}
                  <Link
                    href={`/species/${occurrence.species_id}`}
                    className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline dark:text-green-400"
                  >
                    <BookOpen className="h-4 w-4" />
                    Usos e cuidados
                  </Link>
                </div>
              </div>
              {occurrence.verified && (
                <div className="flex items-center gap-1 text-blue-600 text-xs font-medium dark:text-blue-400">
                  <CheckCircle className="h-4 w-4" />
                  Verificado
                </div>
              )}
            </div>
          </div>

          {/* Ficha: cada dado com o próprio rótulo. Antes eram quatro selos
              soltos lado a lado ("Regular", "Adulta", "Nativa", "Rutaceae"),
              e quem não conhecia o app não sabia o que cada um queria dizer. */}
          <dl className="grid grid-cols-2 gap-2 lg:col-span-2 lg:grid-cols-4">
            <FactTile label="Condição">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: CONDITION_PIN_COLOR[occurrence.condition] ?? CONDITION_PIN_COLOR.healthy }}
                  aria-hidden="true"
                />
                {condition.label}
              </span>
            </FactTile>
            <FactTile label="Estágio">{STAGE_LABEL[occurrence.stage] ?? occurrence.stage}</FactTile>
            {occurrence.species?.origin && (
              <FactTile label="Origem">{ORIGIN_LABEL[occurrence.species.origin] ?? occurrence.species.origin}</FactTile>
            )}
            {occurrence.species?.family && (
              <FactTile label="Família">{occurrence.species.family}</FactTile>
            )}
          </dl>

          {/* Fileira de ações, como no cartão de um lugar no Google Maps: ir
              até lá (a principal, por isso maior), salvar e compartilhar —
              juntas e logo abaixo do nome, sem precisar rolar. Antes salvar
              ficava no cabeçalho e compartilhar no fim da página. */}
          {/* Em tela bem estreita (320 px) "Como chegar" ocupa a linha toda e
              os outros dois dividem a de baixo; daí pra cima, tudo numa linha. */}
          <div className="flex flex-wrap items-start gap-2 lg:col-span-2">
            <DirectionsButton
              latitude={occurrence.latitude}
              longitude={occurrence.longitude}
              className="min-w-0 basis-full min-[360px]:basis-0 min-[360px]:flex-1"
              // Ao lado de Salvar e Compartilhar não cabe o nome do app; o
              // "Abrir em outro app" embaixo continua mostrando a troca.
              showAppName={false}
            />
            <ActionButton
              label={isFav ? 'Salva' : 'Salvar'}
              ariaLabel={isFav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
              pressed={isFav}
              onClick={() => toggle(occurrence.id)}
            >
              <Heart className={cn('h-5 w-5', isFav ? 'fill-red-500 text-red-500' : 'text-gray-700 dark:text-gray-200')} />
            </ActionButton>
            <ActionButton label="Compartilhar" onClick={() => setShareOpen(true)}>
              <Share2 className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </ActionButton>
          </div>

          {/* Visitei: logo depois das ações, porque é a outra coisa que quem
              está diante da planta faz — contar se ela segue lá. */}
          <div className="lg:col-span-2">
            <VisitReport
              occurrenceId={occurrence.id}
              lastSeenAt={occurrence.last_seen_at}
              goneReports={occurrence.gone_reports}
              loggedIn={!!user}
              onReported={() => { getOccurrence(id).then((data) => data && setOccurrence(data)) }}
            />
          </div>

          {/* Autoria: quem cuidou do registro por último (editou, ou registrou se
              ninguém editou), no mesmo formato do perfil/ranking. Full width
              (como header e badges) pra não desemparelhar a dupla detalhes +
              observações da grade do desktop. */}
          {occurrence.credit && (
            <div className="lg:col-span-2">
              <AuthorshipCard
                credit={occurrence.credit}
                isMe={user?.id === occurrence.credit.id}
              />
            </div>
          )}

          {/* Details */}
          <div className={cn(
            'rounded-2xl bg-gray-50 p-4 flex flex-col gap-3 dark:bg-gray-800/60',
            !occurrence.notes && 'lg:col-span-2'
          )}>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-green-600 flex-shrink-0 dark:text-green-400" />
              <span className="text-gray-600 dark:text-gray-300">
                {occurrence.latitude.toFixed(5)}, {occurrence.longitude.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-green-600 flex-shrink-0 dark:text-green-400" />
              {/* Rotulada porque o card de autoria logo acima também mostra data
                  quando o registro foi editado — sem o "Registrado em" as duas
                  datas ficariam ambíguas. */}
              <span className="text-gray-600 dark:text-gray-300">
                Registrado em{' '}
                {new Date(occurrence.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', year: 'numeric'
                })}
              </span>
            </div>
            {occurrence.species?.description && (
              <div className="flex items-start gap-2 text-sm">
                <Leaf className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5 dark:text-green-400" />
                <p className="text-gray-600 dark:text-gray-300">{occurrence.species.description}</p>
              </div>
            )}
          </div>

          {occurrence.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1 dark:text-gray-300">Observações</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 dark:bg-gray-800/60 dark:text-gray-300">{occurrence.notes}</p>
            </div>
          )}

          {canDelete && (
            <Button
              variant="secondary"
              className="w-full lg:col-span-2 !text-red-600 !border-red-200 hover:!bg-red-50 dark:!text-red-400 dark:!border-red-900 dark:hover:!bg-red-900/20"
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
        <p className="text-sm text-gray-500 mb-5 dark:text-gray-400">Esta ação não pode ser desfeita. O registro será removido do mapa.</p>
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
            src={imageUrl(occurrence.photo_url, 1280)}
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

function FactTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-800/60">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{children}</dd>
    </div>
  )
}

/** Botão de ação secundária da fileira (ícone em cima, rótulo embaixo). */
function ActionButton({
  label, ariaLabel, pressed, onClick, children,
}: {
  label: string
  ariaLabel?: string
  pressed?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      className="flex min-h-11 flex-1 flex-col min-[360px]:w-[88px] min-[360px]:flex-none items-center justify-center gap-0.5 rounded-xl border border-gray-200 px-1 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      {children}
      {label}
    </button>
  )
}
