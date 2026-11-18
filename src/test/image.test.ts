import { describe, it, expect } from 'vitest'
import { compressPhoto, fitWithin } from '@/lib/image'

describe('fitWithin', () => {
  it('reduz o lado maior ao teto mantendo a proporção', () => {
    expect(fitWithin(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 })
    expect(fitWithin(3000, 4000, 2048)).toEqual({ width: 1536, height: 2048 })
  })

  it('nunca amplia uma foto menor que o teto', () => {
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 })
  })
})

describe('compressPhoto', () => {
  it('mantém PNG intacto (pode ter transparência)', async () => {
    const png = new File([new Uint8Array(2_000_000)], 'recorte.png', { type: 'image/png' })
    expect(await compressPhoto(png)).toBe(png)
  })


  it('devolve a original quando o navegador não consegue decodificar', async () => {
    const pesada = new File([new Uint8Array(3_000_000)], 'foto.heic', { type: 'image/heic' })
    expect(await compressPhoto(pesada)).toBe(pesada)
  })
})
