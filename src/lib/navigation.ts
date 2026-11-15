/**
 * Atalho "Como chegar": abre a rota até a planta no app de navegação que a
 * pessoa já usa. Os links são universais (https), não esquemas próprios
 * (comgooglemaps://, waze://): com o app instalado o sistema abre o app, e
 * sem ele cai na versão web — nunca num link quebrado.
 */

export type NavApp = 'google' | 'waze' | 'apple'

export interface NavAppInfo {
  id: NavApp
  label: string
  hint: string
}

export const NAV_APPS: Record<NavApp, NavAppInfo> = {
  google: { id: 'google', label: 'Google Maps', hint: 'A pé, de carro, bike ou transporte público' },
  waze: { id: 'waze', label: 'Waze', hint: 'De carro, com trânsito em tempo real' },
  apple: { id: 'apple', label: 'Apple Maps', hint: 'O app de mapas do iPhone' },
}

/** Link que abre a rota da posição atual até o ponto. */
export function navigationUrl(app: NavApp, latitude: number, longitude: number): string {
  const ll = `${latitude},${longitude}`
  switch (app) {
    case 'google':
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ll)}`
    case 'waze':
      return `https://waze.com/ul?ll=${encodeURIComponent(ll)}&navigate=yes`
    case 'apple':
      return `https://maps.apple.com/?daddr=${encodeURIComponent(ll)}`
  }
}

/** iPhone, iPad (que se apresenta como Mac) e Mac — onde o Apple Maps existe. */
export function isAppleDevice(nav: Pick<Navigator, 'userAgent' | 'platform'>): boolean {
  return /iPad|iPhone|iPod|Macintosh/.test(nav.userAgent) || nav.platform === 'MacIntel'
}

/** Apps oferecidos neste aparelho. Apple Maps só onde ele existe. */
export function availableNavApps(appleDevice: boolean): NavApp[] {
  return appleDevice ? ['google', 'waze', 'apple'] : ['google', 'waze']
}

const STORAGE_KEY = 'plantmap:nav-app'

/**
 * App escolhido com "lembrar minha escolha". Ignora a escolha se o app não
 * existe neste aparelho (ex.: Apple Maps salvo e agora num Android).
 */
export function readPreferredNavApp(available: NavApp[]): NavApp | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as NavApp | null
    return v && available.includes(v) ? v : null
  } catch {
    return null
  }
}

export function savePreferredNavApp(app: NavApp | null) {
  try {
    if (app) localStorage.setItem(STORAGE_KEY, app)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sem storage: o atalho só pergunta de novo da próxima vez.
  }
}
