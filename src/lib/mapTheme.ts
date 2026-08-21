/**
 * Recoloração do mapa base para o tema do app.
 *
 * O estilo Liberty vem num bege genérico que destoa do PlantMap, e não muda
 * quando o app entra no tema escuro — um retângulo claro no meio de uma tela
 * escura. Em vez de manter uma cópia do estilo inteiro (que congelaria a
 * versão do Liberty e viraria um arquivo enorme pra manter), aplica-se uma
 * paleta por cima das camadas que ele já traz.
 *
 * A classificação é por `source-layer` do esquema OpenMapTiles (water, park,
 * landcover, building, transportation...), e não por id de camada: os ids são
 * escolha de quem escreveu o estilo e mudam entre versões, enquanto os nomes
 * do esquema são contrato. Camada que não se encaixa em nada é deixada como
 * está, então uma atualização do Liberty degrada para "parte do mapa não
 * recolorida", nunca para mapa quebrado.
 *
 * O sotaque é deliberadamente contido: continua legível como mapa comum, com
 * vias claras e rótulos com contraste. Quem tem que puxar o olho é o pin, não
 * o fundo.
 */

import type { ThemePreference } from '@/types'

/**
 * Faixa noturna do mapa: escuro a partir das 18h, claro a partir das 6h.
 *
 * Hora do aparelho, não do servidor: o que importa é se está escuro onde a
 * pessoa está andando com o celular na mão.
 */
export const NIGHT_START_HOUR = 18
export const NIGHT_END_HOUR = 6

/** Se o relógio local está na faixa noturna. */
export function isNight(date: Date): boolean {
  const h = date.getHours()
  // A faixa cruza a meia-noite, então é "ou", não "e".
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR
}

/**
 * Milissegundos até a próxima virada de faixa, para o mapa trocar sozinho em
 * quem deixa o app aberto atravessando as 18h ou as 6h — sem ficar acordando
 * um timer de minuto em minuto só pra comparar a hora.
 */
export function msUntilNextSwitch(date: Date): number {
  const alvo = new Date(date)
  alvo.setMinutes(0, 0, 0)
  alvo.setHours(isNight(date) ? NIGHT_END_HOUR : NIGHT_START_HOUR)
  if (alvo <= date) alvo.setDate(alvo.getDate() + 1)
  return alvo.getTime() - date.getTime()
}

/**
 * Se o mapa deve usar a paleta escura.
 *
 * Escolha explícita manda: quem marcou "claro" quer claro, inclusive às 22h —
 * o mapa não passa por cima disso. É só no 'automático' que o relógio entra,
 * ao lado da preferência do sistema, porque aí o usuário justamente pediu que
 * o app decidisse sozinho. Ali as duas pistas somam: qualquer uma indicando
 * escuridão basta.
 */
export function shouldUseDarkMap(
  preference: ThemePreference,
  systemIsDark: boolean,
  night: boolean
): boolean {
  if (preference === 'dark') return true
  if (preference === 'light') return false
  return systemIsDark || night
}

export interface MapPalette {
  background: string
  water: string
  /** Parque, mata, gramado — a cor que dá o sotaque. */
  greenery: string
  /** Uso do solo genérico: residencial, hospitalar, escolar. */
  landuse: string
  building: string
  buildingOutline: string
  roadMajor: string
  roadMinor: string
  roadCasing: string
  boundary: string
  label: string
  labelHalo: string
}

export const MAP_PALETTE_LIGHT: MapPalette = {
  background: '#f2f5ed',
  water: '#c5dae4',
  greenery: '#cfe3c5',
  landuse: '#e9eee3',
  building: '#e0e6d9',
  buildingOutline: '#d1d9c6',
  // Pista branca sobre fundo levemente esverdeado: quem dá o desenho da via é
  // o contorno, não o preenchimento. Numa primeira tentativa o contorno ficou
  // claro demais e a malha viária praticamente sumiu do mapa.
  roadMajor: '#ffffff',
  roadMinor: '#ffffff',
  roadCasing: '#cdd7c2',
  boundary: '#b6c0ab',
  label: '#3f4d39',
  labelHalo: '#f2f5ed',
}

export const MAP_PALETTE_DARK: MapPalette = {
  background: '#0e1512',
  water: '#12212a',
  greenery: '#17301f',
  landuse: '#131a16',
  building: '#1a221d',
  buildingOutline: '#232b25',
  roadMajor: '#2c352e',
  roadMinor: '#222a24',
  roadCasing: '#161d18',
  boundary: '#2f3a31',
  label: '#a8bbaa',
  labelHalo: '#0e1512',
}

/** Subconjunto do que se usa de uma camada de estilo, pra função ser testável. */
export interface StyleLayerLike {
  id: string
  type: string
  'source-layer'?: string
}

/** Subconjunto do mapa do MapLibre que esta função precisa. */
export interface MapLike {
  getStyle: () => { layers?: StyleLayerLike[] } | undefined
  setPaintProperty: (layerId: string, prop: string, value: unknown) => void
}

const VIAS_PRINCIPAIS = /motorway|trunk|primary/i

/** Camadas de vegetação no esquema OpenMapTiles. */
const VERDES = new Set(['park', 'landcover'])

/**
 * Propriedades de pintura a aplicar numa camada — vazio quando ela não se
 * encaixa em nenhuma categoria conhecida e deve ficar como está.
 */
export function paintFor(layer: StyleLayerLike, palette: MapPalette): Record<string, string> {
  const fonte = layer['source-layer']

  if (layer.type === 'background') {
    return { 'background-color': palette.background }
  }

  // Rótulos antes da checagem por source-layer: um símbolo é texto venha ele
  // de `place`, `poi` ou `transportation_name`, e todos querem a mesma cor.
  if (layer.type === 'symbol') {
    return { 'text-color': palette.label, 'text-halo-color': palette.labelHalo }
  }

  if (!fonte) return {}

  if (fonte === 'water' || fonte === 'waterway') {
    return layer.type === 'line'
      ? { 'line-color': palette.water }
      : { 'fill-color': palette.water }
  }

  if (VERDES.has(fonte)) {
    return { 'fill-color': palette.greenery }
  }

  if (fonte === 'landuse') {
    return { 'fill-color': palette.landuse }
  }

  if (fonte === 'building') {
    return { 'fill-color': palette.building, 'fill-outline-color': palette.buildingOutline }
  }

  if (fonte === 'transportation' && layer.type === 'line') {
    // O casing é a borda escura desenhada sob a via; o id costuma trazer
    // "casing" justamente por ser uma camada separada da pista.
    if (/casing|outline/i.test(layer.id)) return { 'line-color': palette.roadCasing }
    return { 'line-color': VIAS_PRINCIPAIS.test(layer.id) ? palette.roadMajor : palette.roadMinor }
  }

  if (fonte === 'boundary') {
    return { 'line-color': palette.boundary }
  }

  return {}
}

/**
 * Aplica a paleta ao mapa já carregado.
 *
 * Cada propriedade vai num try/catch próprio: o MapLibre lança se a
 * propriedade não existir para aquele tipo de camada, e uma incompatibilidade
 * pontual não pode derrubar o mapa inteiro — o pior aceitável é uma camada
 * seguir com a cor original.
 */
export function applyMapTheme(map: MapLike, palette: MapPalette): void {
  const layers = map.getStyle()?.layers
  if (!layers) return

  for (const layer of layers) {
    for (const [prop, valor] of Object.entries(paintFor(layer, palette))) {
      try {
        map.setPaintProperty(layer.id, prop, valor)
      } catch {
        // Camada não aceita essa propriedade; segue com a cor do estilo.
      }
    }
  }
}
