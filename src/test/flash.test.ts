import { describe, it, expect, beforeEach } from 'vitest'
import { setFlash, takeFlash } from '@/lib/flash'

describe('flash', () => {
  beforeEach(() => sessionStorage.clear())

  it('entrega a mensagem uma vez só', () => {
    setFlash('Planta salva!')
    expect(takeFlash()).toBe('Planta salva!')
    expect(takeFlash()).toBeNull()
  })

  it('sem mensagem pendente devolve null', () => {
    expect(takeFlash()).toBeNull()
  })
})
