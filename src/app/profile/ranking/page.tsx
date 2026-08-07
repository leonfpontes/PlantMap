import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import AvatarFrame from '@/components/ui/AvatarFrame'
import AdminReviewCard from '@/components/admin/AdminReviewCard'
import RankingRulesAccordion from '@/components/profile/RankingRulesAccordion'
import { createClient } from '@/lib/supabase/server'
import { getLeaderboard } from '@/lib/actions/ranking'
import { BADGE_TIER_CONFIG } from '@/constants/ranking'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const leaderboard = await getLeaderboard()

  return (
    <MobileShell>
      <PageHeader title="Ranking" />

      <div className="flex-1 overflow-y-auto p-4">
        <RankingRulesAccordion />

        {leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/30">
              <Trophy className="h-8 w-8 text-purple-500 dark:text-purple-400" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-300">Ninguém pontuou ainda</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Registre uma ocorrência e mantenha ela atualizada para começar a pontuar
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {leaderboard.map((entry) => {
              const tier = BADGE_TIER_CONFIG[entry.tier]
              const isMe = entry.id === user.id
              return (
                <AdminReviewCard
                  key={entry.id}
                  avatar={<AvatarFrame src={entry.avatar_url} name={entry.full_name} tier={entry.tier} size="md" />}
                  title={entry.full_name || 'Usuário'}
                  subtitle={`${tier.label} · ${entry.points} ponto${entry.points === 1 ? '' : 's'}`}
                  meta={`#${entry.rank}`}
                  tags={isMe ? ['Você'] : undefined}
                  dimmed={entry.points === 0}
                />
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </MobileShell>
  )
}
