import Link from 'next/link'
import { Search } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import BottomNav from '@/components/layout/BottomNav'
import MapView from './MapView'

export default function MapPage() {
  return (
    <MobileShell>
      {/* Search bar overlay */}
      <div className="absolute top-3 left-4 right-4 z-10">
        <Link
          href="/search"
          className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-md border border-gray-100 text-gray-400 text-sm dark:bg-gray-900 dark:border-gray-800 dark:text-gray-500"
        >
          <Search className="h-4 w-4" />
          <span>Buscar espécie...</span>
        </Link>
      </div>

      <div className="flex-1 overflow-hidden">
        <MapView />
      </div>

      <BottomNav />
    </MobileShell>
  )
}
