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

/** Formata uma data como tempo relativo em português ("há 2 dias"). Usado nas notificações. */
export function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000)

  if (diffSec < 60) return 'agora mesmo'

  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `há ${diffMin} min`

  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `há ${diffHour}h`

  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 30) return `há ${diffDay} dia${diffDay !== 1 ? 's' : ''}`

  const diffMonth = Math.round(diffDay / 30)
  if (diffMonth < 12) return `há ${diffMonth} ${diffMonth !== 1 ? 'meses' : 'mês'}`

  const diffYear = Math.round(diffDay / 365)
  return `há ${diffYear} ano${diffYear !== 1 ? 's' : ''}`
}

export function generateShareUrl(occurrenceId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/plant/${occurrenceId}`
}

/**
 * Decodifica uma string hexadecimal representando uma geometria Point no formato EWKB
 * (Extended Well-Known Binary) gerada pelo PostGIS (SRID 4326).
 *
 * O formato EWKB do PostGIS para um Point 2D com SRID contém 25 bytes (50 caracteres hexadecimais):
 * - Byte 0 (1 byte): Endianness (01 para Little Endian, 00 para Big Endian).
 * - Bytes 1-4 (4 bytes): Tipo da geometria (0x20000001 indica POINT com flag SRID ativa).
 * - Bytes 5-8 (4 bytes): SRID (geralmente 4326 para WGS 84).
 * - Bytes 9-16 (8 bytes): Longitude (Double Precision Float de 64 bits / X).
 * - Bytes 17-24 (8 bytes): Latitude (Double Precision Float de 64 bits / Y).
 *
 * @param ewkbHex String hexadecimal retornada pelo banco de dados (ex: '0101000020e6100000...').
 * @returns Um objeto contendo latitude e longitude decimais, ou null caso o formato seja inválido.
 */
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
