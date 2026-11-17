/**
 * Agrupamento de pins por proximidade na tela, para o mapa não virar uma pilha
 * de marcadores sobrepostos quando se afasta o zoom.
 *
 * É feito em espaço de tela, e não em graus: a mesma distância em graus vale
 * larguras muito diferentes conforme o zoom e a latitude, então agrupar por
 * grau juntaria demais numa ponta e de menos na outra. Projetando para pixels
 * do zoom atual, "perto" quer dizer literalmente "perto de encostar um no
 * outro na tela", que é o problema que se quer resolver.
 *
 * Grade simples em vez de clusterização hierárquica: para a escala desta base
 * (centenas a poucos milhares de ocorrências) a diferença visual é mínima e
 * isso cabe numa função pura testável, sem dependência nova. O marcador é
 * posicionado no centroide do grupo, o que suaviza o artefato de dois pontos
 * vizinhos caírem em células diferentes.
 */

/** MapLibre define seus níveis de zoom sobre tiles de 512px. */
const TILE_SIZE = 512

export interface Clusterable {
  latitude: number
  longitude: number
}

export interface Cluster<T extends Clusterable> {
  /** Estável para a mesma composição de grupo, para servir de key no React. */
  id: string
  latitude: number
  longitude: number
  items: T[]
}

/** Projeção Web Mercator normalizada em [0,1]. */
export function toWorld(longitude: number, latitude: number): { x: number; y: number } {
  const lat = Math.max(Math.min(latitude, 85.05112878), -85.05112878)
  const latRad = (lat * Math.PI) / 180
  return {
    x: (longitude + 180) / 360,
    y: (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2,
  }
}

/**
 * Nível de zoom em que o agrupamento é calculado: o inteiro mais próximo.
 *
 * Agrupar no zoom fracionado faz a grade mudar de tamanho a cada quadro de um
 * gesto de pinça, e os grupos se refazem sem parar (pins piscando e trocando
 * de bolha). Em níveis inteiros a composição só muda ao cruzar um nível, e a
 * célula na tela fica entre ~0,7× e ~1,4× de `cellPx` — ainda da ordem do
 * marcador.
 */
export function clusterZoomLevel(zoom: number): number {
  return Math.round(zoom)
}

/**
 * Agrupa por células de `cellPx` pixels no zoom informado. `cellPx` deve ser
 * da ordem do diâmetro do marcador: é a distância abaixo da qual dois pins
 * se atrapalhariam.
 */
export function clusterByScreenGrid<T extends Clusterable>(
  items: T[],
  zoom: number,
  cellPx: number
): Cluster<T>[] {
  if (items.length === 0) return []

  const escala = TILE_SIZE * Math.pow(2, zoom)
  const cell = cellPx / escala

  const grupos = new Map<string, T[]>()
  for (const item of items) {
    const { x, y } = toWorld(item.longitude, item.latitude)
    const chave = `${Math.floor(x / cell)}:${Math.floor(y / cell)}`
    const atual = grupos.get(chave)
    if (atual) atual.push(item)
    else grupos.set(chave, [item])
  }

  return Array.from(grupos.entries()).map(([chave, membros]) => {
    // Centroide em graus: com células de dezenas de pixels a distorção do
    // Mercator dentro de uma célula é irrelevante, e a média em graus mantém
    // o marcador de grupo único exatamente sobre o ponto que ele representa.
    const latitude = membros.reduce((s, m) => s + m.latitude, 0) / membros.length
    const longitude = membros.reduce((s, m) => s + m.longitude, 0) / membros.length
    return { id: `c${chave}:${membros.length}`, latitude, longitude, items: membros }
  })
}

/**
 * Enquadramento que contém todos os pontos, com uma folga proporcional para
 * o grupo não encostar nas bordas ao abrir um cluster.
 */
export function boundsOf<T extends Clusterable>(
  items: T[]
): { west: number; south: number; east: number; north: number } | null {
  if (items.length === 0) return null
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity
  for (const i of items) {
    west = Math.min(west, i.longitude)
    east = Math.max(east, i.longitude)
    south = Math.min(south, i.latitude)
    north = Math.max(north, i.latitude)
  }
  return { west, south, east, north }
}

/**
 * Se o grupo continua encavalado mesmo no zoom máximo de abertura — ou seja,
 * aproximar não vai separar ninguém.
 *
 * Acontece com plantas cuja localização é aproximada (a regra de privacidade
 * encaixa o ponto numa grade, então várias caem na mesmíssima coordenada) e
 * com plantas a poucos metros uma da outra. Nesses casos tocar na bolha não
 * pode só aproximar: o usuário ficaria preso numa bolha que nunca abre.
 */
export function staysClusteredAt<T extends Clusterable>(
  items: T[],
  zoom: number,
  cellPx: number
): boolean {
  if (items.length < 2) return false
  const escala = TILE_SIZE * Math.pow(2, zoom)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const i of items) {
    const { x, y } = toWorld(i.longitude, i.latitude)
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  return (maxX - minX) * escala < cellPx && (maxY - minY) * escala < cellPx
}

/** Retângulo geográfico — o recorte visível do mapa. */
export interface GeoBounds {
  west: number
  south: number
  east: number
  north: number
}

/**
 * Amplia o recorte em `fraction` da largura/altura para cada lado.
 *
 * Os pins fora da tela não são desenhados; a folga é o que garante que, ao
 * arrastar, os vizinhos já estejam lá antes de entrarem na tela.
 */
export function expandBounds(b: GeoBounds, fraction: number): GeoBounds {
  const dx = (b.east - b.west) * fraction
  const dy = (b.north - b.south) * fraction
  return { west: b.west - dx, east: b.east + dx, south: b.south - dy, north: b.north + dy }
}

export function inBounds(p: Clusterable, b: GeoBounds): boolean {
  return p.latitude >= b.south && p.latitude <= b.north && p.longitude >= b.west && p.longitude <= b.east
}
