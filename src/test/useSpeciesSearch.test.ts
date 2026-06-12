import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSpeciesSearch } from '@/hooks/useSpeciesSearch'

vi.mock('@/lib/actions/plants', () => ({
  searchSpecies: vi.fn().mockResolvedValue([
    { id: '1', common_name: 'Aroeira', scientific_name: 'Schinus terebinthifolia' },
  ]),
}))

describe('useSpeciesSearch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty results for short queries', async () => {
    const { result } = renderHook(() => useSpeciesSearch('a'))
    expect(result.current.results).toHaveLength(0)
  })

  it('fetches results when query is at least 2 chars', async () => {
    const { result } = renderHook(() => useSpeciesSearch('ar'))
    await waitFor(() => expect(result.current.results).toHaveLength(1), { timeout: 500 })
    expect(result.current.results[0].common_name).toBe('Aroeira')
  })

  it('clears results when query drops below 2 chars', async () => {
    const { result, rerender } = renderHook(({ q }) => useSpeciesSearch(q), {
      initialProps: { q: 'ar' },
    })
    await waitFor(() => expect(result.current.results).toHaveLength(1), { timeout: 500 })
    rerender({ q: 'a' })
    expect(result.current.results).toHaveLength(0)
  })
})
