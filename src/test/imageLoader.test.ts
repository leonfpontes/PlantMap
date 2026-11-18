import { describe, it, expect } from 'vitest'
import imageLoader, { imageUrl } from '@/lib/imageLoader'

const THUMB = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Lemon.jpg/960px-Lemon.jpg'

describe('imageLoader', () => {
  it('Wikimedia: escolhe o menor tamanho padrão que cobre a largura pedida', () => {
    expect(imageUrl(THUMB, 96)).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Lemon.jpg/120px-Lemon.jpg')
    expect(imageUrl(THUMB, 300)).toContain('/330px-Lemon.jpg')
    expect(imageUrl(THUMB, 640)).toContain('/960px-Lemon.jpg')
  })

  it('Wikimedia: nunca passa do teto guardado no banco (miniatura maior que a foto dá erro)', () => {
    const teto250 = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Lemon.jpg/250px-Lemon.jpg'
    expect(imageUrl(teto250, 1080)).toContain('/250px-Lemon.jpg')
  })

  it('Wikimedia: original pequeno fica como está', () => {
    const original = 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Petiveria.jpg'
    expect(imageUrl(original, 96)).toBe(original)
  })

  it('outras origens passam pelo wsrv.nl reduzidas', () => {
    const foto = 'https://x.supabase.co/storage/v1/object/public/plant-photos/a.jpg'
    const url = new URL(imageLoader({ src: foto, width: 128, quality: 60 }))
    expect(url.hostname).toBe('wsrv.nl')
    expect(url.searchParams.get('url')).toBe(foto)
    expect(url.searchParams.get('w')).toBe('128')
    expect(url.searchParams.get('q')).toBe('60')
    expect(url.searchParams.has('we')).toBe(true)
  })

  it('não mexe em blob:, data: e caminhos locais', () => {
    expect(imageUrl('blob:http://localhost/123', 828)).toBe('blob:http://localhost/123')
    expect(imageUrl('/icons/icon.png', 64)).toBe('/icons/icon.png')
  })
})
