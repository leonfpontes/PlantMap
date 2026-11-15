'use client'

import { useEffect, useState } from 'react'
import { Map, MapPinned, Navigation, ExternalLink } from 'lucide-react'
import BottomSheet from '@/components/ui/BottomSheet'
import {
  availableNavApps,
  isAppleDevice,
  NAV_APPS,
  navigationUrl,
  readPreferredNavApp,
  savePreferredNavApp,
  type NavApp,
} from '@/lib/navigation'
import { cn } from '@/lib/utils'

// Ícones de formas diferentes (e não cores de marca) pra cada app: dá pra
// distinguir de relance sem depender de cor.
const ICONS: Record<NavApp, typeof Map> = {
  google: Map,
  waze: Navigation,
  apple: MapPinned,
}

const PRIMARY =
  'inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ' +
  'bg-green-700 text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 ' +
  'dark:bg-green-600 dark:hover:bg-green-700'

interface DirectionsButtonProps {
  latitude: number
  longitude: number
  className?: string
}

/**
 * "Como chegar": na primeira vez pergunta o app (Google Maps, Waze e, em
 * aparelho Apple, Apple Maps) e oferece lembrar a escolha. Com a escolha
 * lembrada, o botão vira um toque só — direto pro app — e um link discreto
 * embaixo permite abrir em outro app ou trocar o padrão.
 */
export default function DirectionsButton({ latitude, longitude, className }: DirectionsButtonProps) {
  const [apps, setApps] = useState<NavApp[]>(['google', 'waze'])
  const [preferred, setPreferred] = useState<NavApp | null>(null)
  const [open, setOpen] = useState(false)
  const [remember, setRemember] = useState(true)

  // navigator/localStorage só existem no cliente: lidos depois de montar pra
  // não divergir da renderização do servidor.
  useEffect(() => {
    const available = availableNavApps(isAppleDevice(navigator))
    setApps(available)
    setPreferred(readPreferredNavApp(available))
  }, [])

  const choose = (app: NavApp) => {
    if (remember) {
      savePreferredNavApp(app)
      setPreferred(app)
    }
    setOpen(false)
  }

  const forget = () => {
    savePreferredNavApp(null)
    setPreferred(null)
  }

  // Âncoras de verdade (e não window.open): é o que deixa o Android/iOS
  // entregar o link universal pro app instalado em vez de abrir o navegador.
  const linkProps = (app: NavApp) => ({
    href: navigationUrl(app, latitude, longitude),
    target: '_blank',
    rel: 'noopener noreferrer',
  })

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      {preferred ? (
        <a {...linkProps(preferred)} className={PRIMARY}>
          <Navigation className="h-4 w-4" />
          Como chegar
          <span className="font-normal opacity-80">· {NAV_APPS[preferred].label}</span>
        </a>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={PRIMARY}>
          <Navigation className="h-4 w-4" />
          Como chegar
        </button>
      )}

      {preferred && (
        <button
          type="button"
          onClick={() => {
            setRemember(true)
            setOpen(true)
          }}
          className="text-xs text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
        >
          Abrir em outro app
        </button>
      )}

      <BottomSheet title="Como chegar" open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-2">
          {apps.map((app) => {
            const Icon = ICONS[app]
            const isDefault = preferred === app
            return (
              <a
                key={app}
                {...linkProps(app)}
                onClick={() => choose(app)}
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    {NAV_APPS[app].label}
                    {isDefault && (
                      <span className="ml-2 text-xs font-normal text-green-700 dark:text-green-400">padrão</span>
                    )}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{NAV_APPS[app].hint}</span>
                </span>
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
              </a>
            )
          })}
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-green-700"
          />
          Lembrar minha escolha
        </label>

        {preferred && (
          <button
            type="button"
            onClick={() => {
              forget()
              setOpen(false)
            }}
            className="mt-3 text-xs text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
          >
            Perguntar sempre
          </button>
        )}
      </BottomSheet>
    </div>
  )
}
