/**
 * Utilidades puras de geolocalização, separadas do hook pra poderem ser
 * testadas sem navegador. Toda a política de "esse fix presta ou não presta"
 * mora aqui.
 */

/** Raio equatorial da Terra (WGS-84), em metros. */
const EARTH_RADIUS_M = 6_378_137

export interface GeoFix {
  latitude: number
  longitude: number
  /** Raio de confiança de 68% que o navegador reporta, em metros. */
  accuracy: number
  /** Epoch em ms, vindo do próprio evento de posição. */
  timestamp: number
}

/**
 * Precisão a partir da qual o ponto é bom o suficiente pra marcar uma planta
 * sem pedir conferência. ~15 m é o que um GPS de celular entrega a céu aberto
 * depois de convergir.
 */
export const GOOD_ACCURACY_M = 15

/**
 * Acima disso o fix provavelmente veio de rede/torre, não de satélite, e não
 * dá pra confiar nele pra distinguir uma árvore da vizinha — a UI avisa e
 * sugere ajustar no mapa.
 */
export const POOR_ACCURACY_M = 50

/**
 * Depois desse tempo sem leitura aceita, qualquer leitura nova entra mesmo
 * que pior. Sem essa válvula de escape o ponto congela: basta a precisão
 * degradar uma vez (entrar num prédio, por exemplo) pra que todas as leituras
 * seguintes sejam recusadas para sempre.
 */
export const FIX_STALE_MS = 15_000

/**
 * Quanto a precisão pode piorar de uma leitura pra outra sem que a leitura
 * seja tratada como ruído. Enquanto se anda a precisão oscila alguns metros
 * o tempo todo; recusar essas leituras deixaria o ponto para trás do usuário.
 */
export const ACCURACY_TOLERANCE_M = 30

/**
 * Decide se uma leitura nova deve substituir a atual.
 *
 * O caso que isso resolve: `enableHighAccuracy` não impede o navegador de
 * devolver, no meio de uma sequência boa de GPS, um fix de rede com centenas
 * de metros de erro. Aceitar esse fix joga o ponto do usuário a quarteirões
 * de distância e depois o traz de volta — o "pulo" clássico. Por outro lado,
 * recusar leituras demais congela o ponto, que é o problema oposto. Daí as
 * duas válvulas: tolerância pra degradação pequena (movimento real) e
 * expiração por tempo (nunca ficar preso num fix velho).
 */
export function shouldAcceptFix(current: GeoFix | null, next: GeoFix): boolean {
  if (!current) return true

  // Leitura fora de ordem (chega atrasada, mais velha que a atual): ignora.
  if (next.timestamp < current.timestamp) return false

  if (next.timestamp - current.timestamp > FIX_STALE_MS) return true

  const degradacao = next.accuracy - current.accuracy
  if (degradacao <= 0) return true

  return degradacao <= ACCURACY_TOLERANCE_M
}

/** Entre dois fixes, o de menor raio de erro. Empate fica com o mais recente. */
export function bestFix(a: GeoFix | null, b: GeoFix | null): GeoFix | null {
  if (!a) return b
  if (!b) return a
  return b.accuracy < a.accuracy ? b : a
}

/** "±8 m" / "±1,2 km" — o ± é o que comunica que aquilo é margem de erro. */
export function formatAccuracy(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '±? m'
  if (meters < 1000) return `±${Math.round(meters)} m`
  return `±${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

/**
 * Polígono aproximando o círculo de precisão, em coordenadas geográficas.
 *
 * O halo precisa ser desenhado em metros de verdade (um raio de 30 m tem que
 * encolher na tela quando se afasta o zoom), e o `circle-radius` do MapLibre é
 * em pixels — então o círculo vira geometria, não estilo.
 */
export function accuracyCircle(
  latitude: number,
  longitude: number,
  radiusM: number,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const latRad = (latitude * Math.PI) / 180
  const deltaLat = ((radiusM / EARTH_RADIUS_M) * 180) / Math.PI
  // Perto dos polos cos(lat) tende a zero e a correção de longitude explode;
  // o piso mantém o polígono finito num caso que o app nunca vê na prática.
  const deltaLng = deltaLat / Math.max(Math.cos(latRad), 1e-6)

  const ring: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI
    ring.push([longitude + deltaLng * Math.cos(theta), latitude + deltaLat * Math.sin(theta)])
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  }
}
