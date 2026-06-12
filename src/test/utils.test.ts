import { describe, it, expect } from 'vitest'
import { formatDistance, parseEWKBPoint, cn } from '@/lib/utils'

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
