import { describe, it, expect } from 'vitest'
import { formatDistance, formatRelativeTime, parseEWKBPoint, cn, zoomForDistance, DEFAULT_MAP_ZOOM } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('text-red-500', 'text-green-700')).toBe('text-green-700')
  })

  it('ignores falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c')
  })
})

describe('formatDistance', () => {
  it('formats meters below 1000', () => {
    expect(formatDistance(500)).toBe('500m')
  })

  it('rounds meters', () => {
    expect(formatDistance(450.7)).toBe('451m')
  })

  it('formats kilometres', () => {
    expect(formatDistance(1500)).toBe('1.5km')
  })

  it('formats exactly 1000 as km', () => {
    expect(formatDistance(1000)).toBe('1.0km')
  })
})

describe('formatRelativeTime', () => {
  it('returns "agora mesmo" for just now', () => {
    expect(formatRelativeTime(new Date())).toBe('agora mesmo')
  })

  it('formats minutes', () => {
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000))).toBe('há 5 min')
  })

  it('formats hours', () => {
    expect(formatRelativeTime(new Date(Date.now() - 3 * 60 * 60 * 1000))).toBe('há 3h')
  })

  it('formats days with singular/plural', () => {
    expect(formatRelativeTime(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))).toBe('há 1 dia')
    expect(formatRelativeTime(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))).toBe('há 3 dias')
  })

  it('accepts an ISO string', () => {
    expect(formatRelativeTime(new Date(Date.now() - 60 * 60 * 1000).toISOString())).toBe('há 1h')
  })
})

describe('parseEWKBPoint', () => {
  it('returns null for empty string', () => {
    expect(parseEWKBPoint('')).toBeNull()
  })

  it('returns null for short hex', () => {
    expect(parseEWKBPoint('0102030405')).toBeNull()
  })

  it('parses a known EWKB point', () => {
    // Build EWKB for POINT(-46.6333 -23.5505) with SRID 4326 in little-endian
    const buf = new ArrayBuffer(25)
    const view = new DataView(buf)
    view.setUint8(0, 1)                    // little-endian
    view.setUint32(1, 0x20000001, true)    // type: POINT with SRID flag
    view.setUint32(5, 4326, true)          // SRID
    view.setFloat64(9, -46.6333, true)     // longitude (X)
    view.setFloat64(17, -23.5505, true)    // latitude  (Y)
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const result = parseEWKBPoint(hex)
    expect(result).not.toBeNull()
    expect(result!.longitude).toBeCloseTo(-46.6333, 4)
    expect(result!.latitude).toBeCloseTo(-23.5505, 4)
  })
})

describe('zoomForDistance', () => {
  it('keeps the default zoom for plants nearby', () => {
    expect(zoomForDistance(50)).toBe(DEFAULT_MAP_ZOOM)
    expect(zoomForDistance(2000)).toBe(DEFAULT_MAP_ZOOM)
  })

  it('zooms out for a plant in another city (São Paulo → Ribeirão Preto, ~300km)', () => {
    const zoom = zoomForDistance(300_000)
    expect(zoom).toBeLessThan(DEFAULT_MAP_ZOOM)
    expect(zoom).toBe(6)
  })

  it('zooms out further the farther the nearest plant is', () => {
    expect(zoomForDistance(3_000_000)).toBeLessThan(zoomForDistance(300_000))
  })

  it('never goes below world view', () => {
    expect(zoomForDistance(20_000_000)).toBe(2)
  })

  it('handles zero distance without blowing up', () => {
    expect(zoomForDistance(0)).toBe(DEFAULT_MAP_ZOOM)
  })
})
