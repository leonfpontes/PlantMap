'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, MapPinned, Download, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import BottomSheet from '@/components/ui/BottomSheet'
import PrivacyPolicyContent from './PrivacyPolicyContent'
import { updateLocationSharing, exportMyData, deleteMyAccount } from '@/lib/actions/privacy'
import { createClient } from '@/lib/supabase/client'

interface PrivacySettingsProps {
  initialShareExactLocation: boolean
}

/**
 * Tela de Privacidade: escolha de localização (aplica na hora), exportação de
 * dados e exclusão de conta. Política completa reaproveitada do mesmo
 * conteúdo do modal de primeiro acesso (ver PrivacyPolicyContent).
 */
export default function PrivacySettings({ initialShareExactLocation }: PrivacySettingsProps) {
  const [shareExact, setShareExact] = useState(initialShareExactLocation)
  const [locationSaveError, setLocationSaveError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()

  // Debounce: cliques rápidos entre as duas opções disparavam várias gravações
  // em paralelo, que podiam chegar ao banco fora de ordem — a última escolhida
  // na tela nem sempre era a que persistia. Só a escolha em que o usuário
  // "parou" por 400ms é de fato enviada, e nunca duas ao mesmo tempo.
  const pendingLocationChange = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pendingLocationChange.current) clearTimeout(pendingLocationChange.current)
    }
  }, [])

  const handleLocationChange = (value: boolean) => {
    setShareExact(value)
    setLocationSaveError(null)

    if (pendingLocationChange.current) clearTimeout(pendingLocationChange.current)
    pendingLocationChange.current = setTimeout(async () => {
      const result = await updateLocationSharing(value)
      if (result.error) setLocationSaveError(result.error)
    }, 400)
  }

  const handleExport = async () => {
    setExporting(true)
    const data = await exportMyData()
    setExporting(false)
    if (!data) return

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantmap-meus-dados.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const closeDeleteSheet = () => {
    setConfirmDelete(false)
    setConfirmChecked(false)
    setDeleteError(null)
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteMyAccount()
    if (result.error) {
      setDeleting(false)
      setDeleteError(result.error)
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Localização dos meus registros</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleLocationChange(false)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors',
              !shareExact
                ? 'border-green-700 bg-green-50 dark:border-green-500 dark:bg-green-900/30'
                : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
            )}
          >
            <MapPin className={cn('h-6 w-6', !shareExact ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400')} />
            <span className={cn('text-xs font-medium', !shareExact ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300')}>
              Área aproximada
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleLocationChange(true)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors',
              shareExact
                ? 'border-green-700 bg-green-50 dark:border-green-500 dark:bg-green-900/30'
                : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
            )}
          >
            <MapPinned className={cn('h-6 w-6', shareExact ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400')} />
            <span className={cn('text-xs font-medium', shareExact ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300')}>
              Localização exata
            </span>
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          {shareExact
            ? 'Outros usuários veem o ponto exato dos seus registros no mapa.'
            : 'Outros usuários veem só uma área aproximada (~500m) dos seus registros. Você e os administradores sempre veem o ponto exato.'}
        </p>
        {locationSaveError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            Não foi possível salvar: {locationSaveError}. Tente de novo.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Seus dados</h2>
        <Button variant="secondary" className="w-full" loading={exporting} onClick={handleExport}>
          <Download className="h-4 w-4" />
          Baixar meus dados
        </Button>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Política de privacidade</h2>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <PrivacyPolicyContent />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">Zona de risco</h2>
        <Button
          variant="secondary"
          className="w-full !border-red-200 !text-red-600 hover:!bg-red-50 dark:!border-red-900 dark:!text-red-400 dark:hover:!bg-red-900/20"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-4 w-4" />
          Excluir minha conta
        </Button>
      </section>

      <BottomSheet title="Excluir sua conta?" open={confirmDelete} onClose={closeDeleteSheet}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Seu nome e foto serão apagados, seus registros deixam de aparecer no mapa e seus favoritos
            somem. Essa ação não pode ser desfeita.
          </p>
          <label className="flex items-start gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-red-600"
            />
            <span className="text-sm text-red-700 dark:text-red-400">Entendo que essa ação é permanente.</span>
          </label>

          {deleteError && <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={closeDeleteSheet}>
              Cancelar
            </Button>
            <Button
              className="flex-1 !bg-red-600 hover:!bg-red-700"
              disabled={!confirmChecked}
              loading={deleting}
              onClick={handleDelete}
            >
              Excluir conta
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
