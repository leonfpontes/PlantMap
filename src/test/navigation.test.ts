import { describe, it, expect, beforeEach } from 'vitest'
import {
  availableNavApps,
  isAppleDevice,
  navigationUrl,
  readPreferredNavApp,
  savePreferredNavApp,
} from '@/lib/navigation'

const LAT = -21.17278
const LNG = -47.8238

describe('navigationUrl', () => {
  it('Google Maps abre rota até o ponto', () => {
    expect(navigationUrl('google', LAT, LNG)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-21.17278%2C-47.8238'
    )
  })
  it('Waze já inicia a navegação', () => {
    expect(navigationUrl('waze', LAT, LNG)).toBe('https://waze.com/ul?ll=-21.17278%2C-47.8238&navigate=yes')
  })
  it('Apple Maps usa o destino como daddr', () => {
    expect(navigationUrl('apple', LAT, LNG)).toBe('https://maps.apple.com/?daddr=-21.17278%2C-47.8238')
  })
})

describe('apps disponíveis', () => {
  it('Android não oferece Apple Maps', () => {
    const android = { userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B)', platform: 'Linux armv8l' }
    expect(isAppleDevice(android)).toBe(false)
    expect(availableNavApps(false)).toEqual(['google', 'waze'])
  })
  it('iPhone oferece os três', () => {
    const iphone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', platform: 'iPhone' }
    expect(isAppleDevice(iphone)).toBe(true)
    expect(availableNavApps(true)).toEqual(['google', 'waze', 'apple'])
  })
})

describe('app preferido', () => {
  beforeEach(() => localStorage.clear())

  it('lembra e esquece a escolha', () => {
    expect(readPreferredNavApp(['google', 'waze'])).toBeNull()
    savePreferredNavApp('waze')
    expect(readPreferredNavApp(['google', 'waze'])).toBe('waze')
    savePreferredNavApp(null)
    expect(readPreferredNavApp(['google', 'waze'])).toBeNull()
  })

  it('ignora escolha de app que não existe no aparelho', () => {
    savePreferredNavApp('apple')
    expect(readPreferredNavApp(['google', 'waze'])).toBeNull()
  })
})
