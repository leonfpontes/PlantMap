import type { FontScale, ThemePreference } from '@/types'

export const THEME_STORAGE_KEY = 'plantmap:theme'
export const FONT_SCALE_STORAGE_KEY = 'plantmap:font-scale'

/**
 * Script executado de forma síncrona no <head>, antes da hidratação do React,
 * para aplicar tema e tamanho de texto sem "flash" da aparência errada.
 * Duplica a lógica de applyTheme/applyFontScale propositalmente — roda antes
 * de qualquer módulo JS ser carregado.
 */
export const NO_FLASH_SCRIPT = `
(function() {
  try {
    var theme = localStorage.getItem('${THEME_STORAGE_KEY}') || 'system';
    var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-font-scale', localStorage.getItem('${FONT_SCALE_STORAGE_KEY}') || 'normal');
  } catch (e) {}
})();
`

export function getSystemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(theme: ThemePreference) {
  const isDark = theme === 'dark' || (theme === 'system' && getSystemPrefersDark())
  document.documentElement.classList.toggle('dark', isDark)
}

export function applyFontScale(scale: FontScale) {
  document.documentElement.setAttribute('data-font-scale', scale)
}

export function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference) || 'system'
}

export function getStoredFontScale(): FontScale {
  if (typeof window === 'undefined') return 'normal'
  return (localStorage.getItem(FONT_SCALE_STORAGE_KEY) as FontScale) || 'normal'
}

/**
 * Avisa a mesma aba que a *preferência* mudou.
 *
 * A classe `dark` no <html> já é observável, mas ela só conta o tema
 * resolvido: trocar de 'automático' para 'claro' em pleno dia não muda classe
 * nenhuma. Quem precisa distinguir "claro por escolha" de "claro porque agora
 * é dia" (o mapa, ver lib/mapTheme.ts) depende deste aviso. O evento
 * `storage` do navegador não serve porque só dispara nas outras abas.
 */
export const THEME_CHANGE_EVENT = 'plantmap:theme-change'

export function saveTheme(theme: ThemePreference) {
  localStorage.setItem(THEME_STORAGE_KEY, theme)
  applyTheme(theme)
  window.dispatchEvent(new CustomEvent<ThemePreference>(THEME_CHANGE_EVENT, { detail: theme }))
}

export function saveFontScale(scale: FontScale) {
  localStorage.setItem(FONT_SCALE_STORAGE_KEY, scale)
  applyFontScale(scale)
}
