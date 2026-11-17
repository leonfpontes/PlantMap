'use server'

import { createClient } from '@/lib/supabase/server'
import type { Species, SpeciesProfile } from '@/types'

/**
 * Espécie + ficha de uso. A ficha só volta para quem fez login (RLS da
 * migration 032): para visitante, `profile` vem null e `loggedIn` false, e a
 * tela convida a entrar em vez de dizer que não existe ficha.
 */
export async function getSpeciesWithProfile(id: string): Promise<{
  species: Species | null
  profile: SpeciesProfile | null
  loggedIn: boolean
  canRegister: boolean
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: species }, profileRes, permRes] = await Promise.all([
    supabase.from('species').select('*').eq('id', id).maybeSingle(),
    user
      ? supabase.from('species_profiles').select('*').eq('species_id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('profiles').select('can_register_occurrences').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return {
    species: (species as Species) ?? null,
    profile: (profileRes.data as SpeciesProfile) ?? null,
    loggedIn: !!user,
    canRegister: !!(permRes.data as { can_register_occurrences?: boolean } | null)?.can_register_occurrences,
  }
}
