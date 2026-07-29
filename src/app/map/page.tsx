import MobileShell from '@/components/layout/MobileShell'
import BottomNav from '@/components/layout/BottomNav'
import MapView from './MapView'

export default function MapPage() {
  return (
    <MobileShell desktopWidth="full">
      <div className="flex-1 overflow-hidden">
        <MapView />
      </div>

      <BottomNav />
    </MobileShell>
  )
}
