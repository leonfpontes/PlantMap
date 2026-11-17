'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { HeartHandshake, LocateOff, RefreshCw, SearchX, ThermometerSun, Clock } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import PlantCard from '@/components/plant/PlantCard'
import { getCareMissions } from '@/lib/actions/reports'
import { useGeolocation } from '@/hooks/useGeolocation'
import { formatSeenAgo, type CareMission, type MissionReason } from '@/lib/careMissions'
import { useUser } from '@/hooks/useUser'

const REASON: Record<MissionReason, { label: (m: CareMission) => string; icon: typeof Clock; className: string }> = {
  gone: {
    label: (m) => `${m.occurrence.gone_reports} ${m.occurrence.gone_reports === 1 ? 'pessoa não encontrou' : 'pessoas não encontraram'} — confira se ela segue lá`,
    icon: SearchX,
    className: 'text-amber-800 bg-amber-50 dark:text-amber-200 dark:bg-amber-900/40',
  },
  poor: {
    label: () => 'Estava ruim na última visita — veja como ela está',
    icon: ThermometerSun,
    className: 'text-red-800 bg-red-50 dark:text-red-200 dark:bg-red-900/40',
  },
  stale: {
    label: (m) => `Sem notícia: ${formatSeenAgo(m.daysSinceSeen) ?? 'há muito tempo'}`,
    icon: Clock,
    className: 'text-gray-700 bg-gray-100 dark:text-gray-200 dark:bg-gray-800',
  },
}

/**
 * Missões de cuidado: as plantas perto da pessoa que mais precisam de uma
 * visita. Cada "Estive aqui" vale 10 pontos (1x por planta a cada 7 dias).
 */
export default function MissionsPage() {
  const { user, loading: userLoading } = useUser()
  const { latitude, longitude, acquireBestFix, error: geoError } = useGeolocation()
  const [missions, setMissions] = useState<CareMission[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let lat = latitude
    let lng = longitude
    if (lat == null || lng == null) {
      const fix = await acquireBestFix({ timeoutMs: 10_000 })
      lat = fix?.latitude ?? null
      lng = fix?.longitude ?? null
    }
    if (lat == null || lng == null) {
      setMissions(null)
      setLoading(false)
      return
    }
    setMissions(await getCareMissions(lat, lng))
    setLoading(false)
  }, [latitude, longitude, acquireBestFix])

  // Carrega uma vez ao abrir (ou quando a localização chega pela primeira vez).
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (started) return
    setStarted(true)
    load()
  }, [started, load])

  return (
    <MobileShell>
      <PageHeader title="Missões de cuidado" />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-green-50 p-4 dark:bg-green-900/20">
          <HeartHandshake className="h-6 w-6 flex-shrink-0 text-green-700 dark:text-green-400" />
          <div className="text-sm text-green-900 dark:text-green-100">
            <p className="font-semibold">Plantas perto de você que precisam de uma visita</p>
            <p className="mt-0.5 text-green-800 dark:text-green-200">
              Passe por elas e toque em <span className="font-semibold">Estive aqui</span>: cada visita vale
              10 pontos (uma vez por planta a cada 7 dias).
            </p>
          </div>
        </div>

        {!userLoading && !user && (
          <Link
            href="/auth/login"
            className="mb-4 flex min-h-11 items-center justify-center rounded-xl bg-green-700 text-sm font-semibold text-white hover:bg-green-800 dark:bg-green-600"
          >
            Entre para cumprir missões e ganhar pontos
          </Link>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800" />
            ))}
          </div>
        )}

        {!loading && missions == null && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <LocateOff className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="font-medium text-gray-700 dark:text-gray-200">Precisamos da sua localização</p>
            <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
              {geoError ?? 'As missões mostram plantas perto de você.'} Ative a localização e tente de novo.
            </p>
            <button
              type="button"
              onClick={load}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar de novo
            </button>
          </div>
        )}

        {!loading && missions && missions.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <HeartHandshake className="h-10 w-10 text-green-500" />
            <p className="font-medium text-gray-700 dark:text-gray-200">Tudo cuidado por aqui!</p>
            <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
              Nenhuma planta num raio de 10 km precisa de visita agora.
            </p>
          </div>
        )}

        {!loading && missions && missions.length > 0 && (
          <ul className="flex flex-col gap-4">
            {missions.map((m) => {
              const r = REASON[m.reason]
              const Icon = r.icon
              return (
                <li key={m.occurrence.id}>
                  <p className={`mb-1.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${r.className}`}>
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {r.label(m)}
                  </p>
                  <PlantCard occurrence={m.occurrence} />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <BottomNav />
    </MobileShell>
  )
}
