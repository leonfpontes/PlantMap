import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

export function generateShareUrl(occurrenceId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/plant/${occurrenceId}`
}

export function parseEWKBPoint(ewkbHex: string): { latitude: number; longitude: number } | null {
  if (!ewkbHex || typeof ewkbHex !== 'string') return null
  
  const cleanHex = ewkbHex.startsWith('0x') ? ewkbHex.substring(2) : ewkbHex
  const len = cleanHex.length
  
  // A standard 2D Point in EWKB with SRID has 50 hex chars (25 bytes)
  if (len < 50) return null

  const bytes = new Uint8Array(len / 2)
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16)
  }
  
  const isLittleEndian = bytes[0] === 1
  const view = new DataView(bytes.buffer)
  
  // Offset 9 contains longitude (X) and offset 17 contains latitude (Y)
  const longitude = view.getFloat64(9, isLittleEndian)
  const latitude = view.getFloat64(17, isLittleEndian)
  
  return { latitude, longitude }
}
