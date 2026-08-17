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

/** Zoom padrão do mapa quando já existem plantas perto de quem abriu o app. */
export const DEFAULT_MAP_ZOOM = 12

/**
 * Escolhe o zoom inicial do mapa de forma que a ocorrência mais próxima caiba na tela.
 *
 * Sem isso, quem está viajando abre o app centrado na própria localização com o zoom
 * padrão e vê um mapa vazio — as plantas até vêm da busca (que hoje é sem limite de
 * raio), só estão a centenas de quilômetros dali, fora do enquadramento.
 *
 * A conta é a aproximação de Web Mercator: cada nível de zoom divide a largura visível
 * do mundo (~40.000km) por 2. Manter a distância abaixo de ~1/4 dessa largura deixa a
 * planta bem dentro da tela em vez de colada na borda — daí o 20.000 em vez de 40.000.
 * Nunca passa do zoom padrão (não faz sentido aproximar mais do que o normal só porque
 * a planta está a 50m) nem desce abaixo de 2 (o mundo inteiro já cabe).
 */
export function zoomForDistance(distanceM: number): number {
  const km = Math.max(distanceM, 1) / 1000
  const zoom = Math.floor(Math.log2(20000 / km))
  return Math.min(DEFAULT_MAP_ZOOM, Math.max(2, zoom))
}

/**
 * Forma canônica de um texto para busca. Espelha `search_normalize` do banco
 * (migrations 025 e 027) — os dois precisam concordar, porque a comparação sempre
 * põe o termo digitado aqui contra as colunas `*_normalized` calculadas lá.
 *
 * Duas coisas acontecem:
 *   - Acento sai: quem digita "guine" ou "acafrao" acha "Guiné" e "Açafrão". A
 *     decomposição NFD separa a letra do acento, e o range U+0300–U+036F cobre os
 *     diacríticos combinantes — inclusive a cedilha (ç -> c), como o `unaccent`.
 *   - Pontuação vira espaço: hífen, barra e apóstrofo separam palavras no catálogo
 *     ("Espada-de-São-Jorge", "Alfavaca / Alfavaquinha"), mas ninguém digita assim.
 *     Sem isso, "espada de sao jorge" não acha nada.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Se o que o usuário digitou casa com algum dos campos, na mesma regra da busca do
 * banco (`search_species`, migration 027): cada palavra digitada precisa aparecer
 * em pelo menos um dos campos, em qualquer ordem. É o que faz "jorge espada" achar
 * "Espada-de-São-Jorge", e "petiveria guine" achar "Guiné" — uma palavra bate no
 * nome popular, a outra no científico.
 *
 * Query vazia casa com tudo; quem chama decide se chega a filtrar.
 */
export function matchesSearchTerms(query: string, ...fields: (string | null | undefined)[]): boolean {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean)
  if (terms.length === 0) return true

  const haystacks = fields
    .filter((field): field is string => !!field)
    .map(normalizeSearchText)

  return terms.every((term) => haystacks.some((haystack) => haystack.includes(term)))
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
