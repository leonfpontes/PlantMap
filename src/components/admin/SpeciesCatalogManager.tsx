'use client'

import { useState } from 'react'
import { Search, ImageOff, Plus, Pencil, Trash2 } from 'lucide-react'
import { Species } from '@/types'
import { listAllSpeciesAdmin, deleteSpeciesAdmin } from '@/lib/actions/species'
import { SPECIES_STATUS_CONFIG } from '@/constants/plant'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import SpeciesFormSheet from './SpeciesFormSheet'

interface SpeciesCatalogManagerProps {
  initialSpecies: Species[]
}

/**
 * Catálogo completo de espécies (qualquer status) com CRUD manual por admin
 * (migration 022): cadastrar, editar todos os dados (inclusive foto) e excluir
 * — além da busca/visualização que já existia aqui. Moderação de sugestões
 * pendentes continua sendo uma ação separada (aba "Pendentes", `reviewSpecies`).
 */
export default function SpeciesCatalogManager({ initialSpecies }: SpeciesCatalogManagerProps) {
  const [species, setSpecies] = useState(initialSpecies)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [formSpecies, setFormSpecies] = useState<Species | null | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null)

  const handleSearch = async (value: string) => {
    setQuery(value)
    setSearching(true)
    const results = await listAllSpeciesAdmin(value)
    setSpecies(results)
    setSearching(false)
  }

  const handleSaved = (saved: Species) => {
    setSpecies((prev) => {
      const exists = prev.some((s) => s.id === saved.id)
      const next = exists ? prev.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...prev]
      return next.sort((a, b) => a.common_name.localeCompare(b.common_name, 'pt-BR'))
    })
    setFormSpecies(undefined)
  }

  const handleDelete = async (id: string) => {
    setBusyDeleteId(id)
    setDeleteError(null)
    const result = await deleteSpeciesAdmin(id)
    if (result.error) {
      setDeleteError(result.error)
    } else {
      setSpecies((prev) => prev.filter((s) => s.id !== id))
      setDeletingId(null)
    }
    setBusyDeleteId(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar espécie no catálogo..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <Button size="md" onClick={() => setFormSpecies(null)} className="flex-shrink-0">
          <Plus className="h-4 w-4" />
          Nova
        </Button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {searching ? 'Buscando...' : `${species.length} espécie${species.length === 1 ? '' : 's'}`}
      </p>

      {deleteError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{deleteError}</p>
      )}

      <div className="flex flex-col gap-2">
        {species.map((sp) => (
          <div
            key={sp.id}
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-green-50 dark:bg-green-900/30">
              {sp.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sp.image_url} alt={sp.common_name} className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="h-5 w-5 text-gray-300 dark:text-gray-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{sp.common_name}</p>
                <Badge variant={SPECIES_STATUS_CONFIG[sp.status].variant} className="flex-shrink-0">
                  {SPECIES_STATUS_CONFIG[sp.status].label}
                </Badge>
              </div>
              {sp.scientific_name && (
                <p className="truncate text-xs italic text-gray-500 dark:text-gray-400">{sp.scientific_name}</p>
              )}

              {deletingId === sp.id && (
                <div className="mt-2 flex flex-col gap-2 rounded-xl bg-red-50 p-2 dark:bg-red-900/20">
                  <p className="text-xs text-red-700 dark:text-red-400">Excluir definitivamente? Não pode ser desfeito.</p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setDeletingId(null); setDeleteError(null) }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      loading={busyDeleteId === sp.id}
                      onClick={() => handleDelete(sp.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-shrink-0 gap-1">
              <button
                type="button"
                aria-label={`Editar ${sp.common_name}`}
                onClick={() => setFormSpecies(sp)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Excluir ${sp.common_name}`}
                onClick={() => { setDeletingId(sp.id); setDeleteError(null) }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <SpeciesFormSheet
        open={formSpecies !== undefined}
        species={formSpecies}
        onClose={() => setFormSpecies(undefined)}
        onSaved={handleSaved}
      />
    </div>
  )
}
