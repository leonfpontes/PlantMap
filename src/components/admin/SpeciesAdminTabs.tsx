'use client'

import { useState } from 'react'
import { Species } from '@/types'
import { SpeciesModerationItem } from '@/lib/actions/species'
import SpeciesModerationList from './SpeciesModerationList'
import SpeciesCatalogManager from './SpeciesCatalogManager'
import { cn } from '@/lib/utils'

interface SpeciesAdminTabsProps {
  pendingSpecies: SpeciesModerationItem[]
  catalogSpecies: Species[]
}

/** Alterna entre a fila de moderação e a gestão de fotos do catálogo em /admin/species. */
export default function SpeciesAdminTabs({ pendingSpecies, catalogSpecies }: SpeciesAdminTabsProps) {
  const [tab, setTab] = useState<'pending' | 'catalog'>(pendingSpecies.length > 0 ? 'pending' : 'catalog')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
          Pendentes{pendingSpecies.length > 0 && ` (${pendingSpecies.length})`}
        </TabButton>
        <TabButton active={tab === 'catalog'} onClick={() => setTab('catalog')}>
          Catálogo de fotos
        </TabButton>
      </div>

      {tab === 'pending' ? (
        <SpeciesModerationList initialSpecies={pendingSpecies} />
      ) : (
        <SpeciesCatalogManager initialSpecies={catalogSpecies} />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  )
}
