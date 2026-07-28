import Link from 'next/link'
import { Compass, Search } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import BottomNav from '@/components/layout/BottomNav'
import Button from '@/components/ui/Button'

/**
 * 404 global do app (App Router: qualquer rota não encontrada cai aqui).
 * Ilustração de vasinho murcho é um SVG inline próprio — sem dependência nova.
 */
export default function NotFound() {
  return (
    <MobileShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-10 text-center">
        <WiltedPotIllustration
          className="h-40 w-40 motion-safe:animate-[sway_4s_ease-in-out_infinite]"
          style={{ transformOrigin: '50% 82%' }}
        />

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Essa espécie não foi catalogada por aqui
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Você chegou a um canteiro vazio. A página que você procura murchou,
            foi replantada em outro endereço ou nunca brotou por aqui.
          </p>
        </div>

        {/* Fichinha de espécie, no mesmo estilo dos cards do app — a piada é o conteúdo. */}
        <div className="w-full max-w-xs rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Ficha da ocorrência
          </p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">Página perdida</p>
          <p className="text-xs italic text-gray-500 dark:text-gray-400">Paginum inexistus</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Condição: <span className="font-medium text-gray-700 dark:text-gray-300">Murcha (código 404)</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Origem: <span className="font-medium text-gray-700 dark:text-gray-300">Desconhecida, provavelmente um link digitado errado</span>
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-2">
          <Link href="/map" className="w-full">
            <Button variant="primary" size="lg" className="w-full">
              <Compass className="h-4 w-4" />
              Voltar para o mapa
            </Button>
          </Link>
          <Link href="/search" className="w-full">
            <Button variant="secondary" size="lg" className="w-full">
              <Search className="h-4 w-4" />
              Buscar outras espécies
            </Button>
          </Link>
        </div>
      </div>

      <BottomNav />
    </MobileShell>
  )
}

function WiltedPotIllustration({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 160 160" className={className} style={style} aria-hidden="true">
      {/* Terra */}
      <ellipse cx="80" cy="132" rx="34" ry="6" className="fill-black/10 dark:fill-black/40" />
      {/* Vaso */}
      <path
        d="M52 96h56l-6 34a8 8 0 0 1-8 7H66a8 8 0 0 1-8-7z"
        className="fill-orange-300 dark:fill-orange-900"
      />
      <rect x="48" y="88" width="64" height="12" rx="4" className="fill-orange-400 dark:fill-orange-800" />
      {/* Caule murcho, curvando pra baixo */}
      <path
        d="M80 88C80 88 84 66 74 54C66 44 70 30 80 22"
        fill="none"
        stroke="#15803d"
        strokeWidth="4"
        strokeLinecap="round"
        className="dark:stroke-green-600"
      />
      {/* Folhas caídas */}
      <path
        d="M74 54C68 52 60 54 56 60C63 63 71 61 74 54Z"
        className="fill-green-700 dark:fill-green-600"
      />
      <path
        d="M78 40C73 36 65 36 60 40C66 45 74 45 78 40Z"
        className="fill-green-600 dark:fill-green-700"
      />
      {/* Florzinha murcha no topo, cabeça baixa */}
      <circle cx="80" cy="20" r="7" className="fill-yellow-400 dark:fill-yellow-600" />
      <circle cx="80" cy="20" r="3" className="fill-yellow-600 dark:fill-yellow-800" />
      {/* Olhinhos "x x" de desânimo, bem sutil */}
      <path d="M76 19l2 2M78 19l-2 2" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />
      <path d="M82 19l2 2M84 19l-2 2" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}
