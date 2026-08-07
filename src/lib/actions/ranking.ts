'use server'

import { createClient } from '@/lib/supabase/server'
import { LeaderboardEntry, BadgeTier } from '@/types'
import { getBadgeTier } from '@/constants/ranking'

/**
 * Top N por pontos (ver migration 023). Leitura pura via RLS — `profiles` já
 * tem policy de select pública (`using (true)`, migration 001), então não
 * precisa de RPC, mesmo padrão de `getUserStats` em `profile.ts`.
 */
export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, points')
    .is('deleted_at', null)
    .order('points', { ascending: false })
    .limit(limit)

  return (data || []).map((p, i) => ({
    id: p.id,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
    points: p.points,
    tier: getBadgeTier(p.points),
    rank: i + 1,
  }))
}

/** Posição do próprio usuário no ranking, mesmo fora do top N exibido na lista. */
export async function getMyRankingSummary(
  userId: string
): Promise<{ points: number; tier: BadgeTier; rank: number } | null> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single()
  if (!profile) return null

  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gt('points', profile.points)

  return { points: profile.points, tier: getBadgeTier(profile.points), rank: (count || 0) + 1 }
}
