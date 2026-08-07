import { redirect } from 'next/navigation'
import { Trophy, Info } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import AdminReviewCard from '@/components/admin/AdminReviewCard'
import { createClient } from '@/lib/supabase/server'
import { getLeaderboard } from '@/lib/actions/ranking'
import { BADGE_TIER_CONFIG, BADGE_TIERS_ORDERED, POINTS_CONFIG } from '@/constants/ranking'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const leaderboard = await getLeaderboard()

  return (
    <MobileShell>
      <PageHeader title="Ranking" />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-2xl border border-purple-100 bg-purple-50 p-4 text-sm dark:border-purple-900 dark:bg-purple-900/20">
          <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
            <Info className="h-4 w-4 flex-shrink-0" />
            <p className="font-semibold">Como funciona o ranking</p>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-purple-800 dark:text-purple-300">
            <li>+{POINTS_CONFIG.REGISTER} pontos ao registrar uma ocorrência nova</li>
            <li>
              +{POINTS_CONFIG.MAINTAIN} pontos ao atualizar condição, estágio, foto ou observações de um
              registro seu — no máximo uma vez a cada {POINTS_CONFIG.MAINTAIN_COOLDOWN_DAYS} dias por
              ocorrência, pra valer por cuidado de verdade, não por salvar de novo sem mudar nada
            </li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {BADGE_TIERS_ORDERED.map((t) => {
              const tier = BADGE_TIER_CONFIG[t]
              return (
                <Badge key={t} variant={tier.variant}>
                  {tier.label} · {tier.minPoints}+
                </Badge>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-purple-700 dark:text-purple-400">
            É só reconhecimento dentro do terreiro — sem prêmio associado, e edições feitas por um
            administrador no seu registro não geram pontos.
          </p>
        </div>

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
                  avatar={<Avatar src={entry.avatar_url} name={entry.full_name} size="md" />}
                  title={entry.full_name || 'Usuário'}
                  subtitle={`${entry.points} ponto${entry.points === 1 ? '' : 's'}`}
                  meta={`#${entry.rank}`}
                  pills={[{ label: tier.label, variant: tier.variant }]}
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
