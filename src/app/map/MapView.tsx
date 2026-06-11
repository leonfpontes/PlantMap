'use client'

import dynamic from 'next/dynamic'

const PlantMap = dynamic(() => import('@/components/map/PlantMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-green-50 animate-pulse" />,
})

export default function MapView() {
  return <PlantMap />
}
