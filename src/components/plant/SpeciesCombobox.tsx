'use client'

import { useState } from 'react'
import { useSpeciesSearch } from '@/hooks/useSpeciesSearch'
import { Species } from '@/types'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { SPECIES_STATUS_CONFIG } from '@/constants/plant'
import SpeciesSubmitSheet from './SpeciesSubmitSheet'
import SpeciesAvatar from './SpeciesAvatar'

interface SpeciesComboboxProps {
  initialQuery?: string
  selected: Species | null
  onSelect: (species: Species) => void
  error?: string
}

/**
 * Busca de espécie com debounce (useSpeciesSearch) + atalho para sugerir uma
 * erva nova quando o catálogo não tem o que o usuário procura (ver
 * SpeciesSubmitSheet e migration 013). Usado por RegisterForm e EditForm.
 */
export default function SpeciesCombobox({ initialQuery, selected, onSelect, error }: SpeciesComboboxProps) {
  const [query, setQuery] = useState(initialQuery || '')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const { results } = useSpeciesSearch(query)

  const handleSelect = (species: Species) => {
    onSelect(species)
    setQuery(species.common_name)
  }

  const handleSuggested = (species: Species) => {
    setSuggestOpen(false)
    handleSelect(species)
  }

  return (
    <div className="relative">
      <Input
        label="Espécie *"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome comum, científico ou ritual..."
        error={error}
      />

      {query.length >= 2 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {results.map((sp) => (
            <li key={sp.id}>
              <button
                type="button"
                onClick={() => handleSelect(sp)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-green-50 transition-colors dark:hover:bg-green-900/20"
              >
                <SpeciesAvatar imageUrl={sp.image_url} alt={sp.common_name} size={28} />
                <span className="font-medium text-gray-900 dark:text-gray-100">{sp.common_name}</span>
                {sp.scientific_name && (
                  <span className="text-xs italic text-gray-500 dark:text-gray-400">{sp.scientific_name}</span>
                )}
                {sp.status === 'pending' && (
                  <Badge variant="yellow" className="ml-auto flex-shrink-0">Pendente</Badge>
                )}
              </button>
            </li>
          ))}
          <li className={results.length > 0 ? 'border-t border-gray-100 dark:border-gray-800' : undefined}>
            <button
              type="button"
              onClick={() => setSuggestOpen(true)}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-green-700 hover:bg-green-50 transition-colors dark:text-green-400 dark:hover:bg-green-900/20"
            >
              + Não encontrou? Sugerir &quot;{query}&quot; como nova erva
            </button>
          </li>
        </ul>
      )}

      {selected && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <SpeciesAvatar imageUrl={selected.image_url} alt={selected.common_name} size={24} />
          {selected.scientific_name && (
            <p className="text-xs italic text-green-700 dark:text-green-400">{selected.scientific_name}</p>
          )}
          {selected.status !== 'approved' && (
            <Badge variant={SPECIES_STATUS_CONFIG[selected.status].variant}>
              {SPECIES_STATUS_CONFIG[selected.status].label}
            </Badge>
          )}
        </div>
      )}

      <SpeciesSubmitSheet
        key={suggestOpen ? 'open' : 'closed'}
        open={suggestOpen}
        initialCommonName={query}
        onClose={() => setSuggestOpen(false)}
        onSubmitted={handleSuggested}
      />
    </div>
  )
}
