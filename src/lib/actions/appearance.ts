'use server'

import { createClient } from '@/lib/supabase/server'
import { FontScale, ThemePreference } from '@/types'

/** Preferência de aparência salva na conta (usada para sincronizar entre aparelhos). */
export async function getAppearancePrefs(): Promise<{ theme: ThemePreference; fontScale: FontScale } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('theme_preference, font_scale')
    .eq('id', user.id)
    .single()

  if (!data) return null
  return { theme: data.theme_preference, fontScale: data.font_scale }
}

export async function updateAppearancePrefs(prefs: {
  theme?: ThemePreference
  fontScale?: FontScale
}): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const updates: Record<string, string> = {}
  if (prefs.theme) updates.theme_preference = prefs.theme
  if (prefs.fontScale) updates.font_scale = prefs.fontScale

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
  if (error) return { error: error.message }
  return { success: true }
}
