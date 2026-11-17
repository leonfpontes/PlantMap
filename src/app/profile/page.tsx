import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Heart, LogOut, ChevronRight, Bell, Lock, Palette, HelpCircle, Leaf, Sprout, UserCheck, LayoutGrid, Trophy, HeartHandshake } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import AvatarFrame from '@/components/ui/AvatarFrame'
import Badge from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getUserStats } from '@/lib/actions/profile'
import { listPendingSpecies } from '@/lib/actions/species'
import { getUnreadNotificationCount } from '@/lib/actions/notifications'
import { getOpenSupportMessageCount } from '@/lib/actions/support'
import { getOpenPermissionRequestCount } from '@/lib/actions/permissions'
import { getGoneFlaggedCount } from '@/lib/actions/reports'
import { getMyRankingSummary } from '@/lib/actions/ranking'
import { signOut } from '@/lib/actions/auth'
import { BADGE_TIER_CONFIG, getNextBadgeTier } from '@/constants/ranking'

// Lista de menu é comprida — no celular fica em coluna única, mas no desktop
// isso vira uma rolagem longa numa coluna estreita. Card mais largo + grade
// de 2 colunas abaixo aproveitam o espaço em vez de esticar tudo fininho.
const DESKTOP_WIDTH_CLASS = 'lg:max-w-4xl'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/map')

  const [profile, stats, unreadNotifications, ranking] = await Promise.all([
    getProfile(),
    getUserStats(user.id),
    getUnreadNotificationCount(),
    getMyRankingSummary(user.id),
  ])

  const nextTier = ranking ? getNextBadgeTier(ranking.points) : null

  const pendingAdminCount = profile?.is_admin
    ? await Promise.all([listPendingSpecies(), getOpenSupportMessageCount(), getOpenPermissionRequestCount(), getGoneFlaggedCount()]).then(
        ([species, support, permissions, gone]) => species.length + support + permissions + gone
      )
    : 0

  return (
    <MobileShell className={DESKTOP_WIDTH_CLASS}>
      <PageHeader title="Perfil" showBack={false} />

      <div className="flex-1 overflow-y-auto">
        <div className="lg:flex lg:flex-row lg:items-stretch">
          {/* Profile header */}
          <div className="flex flex-col items-center gap-3 bg-green-50 px-6 py-8 dark:bg-green-900/20 lg:flex-1 lg:flex-row lg:justify-start lg:gap-5 lg:px-8">
            <AvatarFrame
              src={profile?.avatar_url}
              name={profile?.full_name || user.email}
              tier={ranking?.tier || 'sementeira'}
              size="xl"
            />
            <div className="text-center lg:text-left">
              <h2 className="font-bold text-gray-900 text-lg dark:text-gray-100">{profile?.full_name || 'Usuário'}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              {ranking && (
                <>
                  <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {BADGE_TIER_CONFIG[ranking.tier].label}
                  </p>
                  {/* Sem isso, quem alcança a moldura mais alta que existe fica
                      sem alvo nenhum à vista — que foi exatamente o que motivou
                      esticar a escada de tiers. */}
                  {nextTier && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Faltam {nextTier.pointsAway} ponto{nextTier.pointsAway === 1 ? '' : 's'} para{' '}
                      {BADGE_TIER_CONFIG[nextTier.tier].label}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900 lg:w-56 lg:flex-shrink-0 lg:grid-cols-1 lg:divide-x-0 lg:divide-y lg:border-b-0 lg:border-l">
            {[
              { label: 'Registros', value: stats.occurrences },
              { label: 'Favoritos', value: stats.favorites },
              { label: 'Espécies', value: stats.species },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-3">
                <span className="text-xl font-bold text-green-700 dark:text-green-400">{value}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 p-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:p-6">
          {/* Agrupado por assunto: nove cartões soltos, cada um de uma cor,
              obrigavam a ler a lista inteira pra achar uma opção. */}
          <MenuGroup title="Minhas plantas">
            <MenuItem href="/missions" icon={HeartHandshake} label="Missões de cuidado" />
            <MenuItem href="/profile/favorites" icon={Heart} label="Plantas favoritas" />
            <MenuItem href="/profile/plants" icon={Leaf} label="Meus registros" />
            <MenuItem href="/profile/species" icon={Sprout} label="Ervas que sugeri" />
          </MenuGroup>

          <MenuGroup title="Conta">
            <MenuItem
              href="/profile/notifications"
              icon={Bell}
              label="Notificações"
              badge={unreadNotifications > 0
                ? <Badge variant="red">{unreadNotifications} nova{unreadNotifications !== 1 ? 's' : ''}</Badge>
                : undefined}
            />
            <MenuItem
              href="/profile/ranking"
              icon={Trophy}
              label="Ranking"
              badge={ranking
                ? <Badge variant={BADGE_TIER_CONFIG[ranking.tier].variant}>{BADGE_TIER_CONFIG[ranking.tier].label}</Badge>
                : undefined}
            />
            <MenuItem href="/profile/permission" icon={UserCheck} label="Permissão para registrar" />
          </MenuGroup>

          <MenuGroup title="Preferências">
            <MenuItem href="/profile/appearance" icon={Palette} label="Aparência e tamanho do texto" />
            <MenuItem href="/profile/privacy" icon={Lock} label="Privacidade" />
            <MenuItem href="/profile/help" icon={HelpCircle} label="Ajuda e suporte" />
          </MenuGroup>

          {profile?.is_admin && (
            <MenuGroup title="Administração">
              <MenuItem
                href="/admin"
                icon={LayoutGrid}
                label="Painel do admin"
                badge={pendingAdminCount > 0
                  ? <Badge variant="yellow">{pendingAdminCount} pendente{pendingAdminCount !== 1 ? 's' : ''}</Badge>
                  : undefined}
              />
            </MenuGroup>
          )}

          {/* Sign out */}
          <form action={signOut} className="mt-2 lg:col-span-2 lg:mt-0">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-600 hover:bg-red-100 transition-colors dark:border-red-900 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Sair da conta</span>
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </MobileShell>
  )
}

function MenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h2>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
        {children}
      </div>
    </section>
  )
}

function MenuItem({
  href, icon: Icon, label, badge,
}: {
  href: string
  icon: React.ElementType
  label: string
  badge?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-800"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
        <Icon className="h-5 w-5 text-green-700 dark:text-green-400" />
      </span>
      <span className="flex-1 text-[15px] font-medium text-gray-900 dark:text-gray-100">{label}</span>
      {badge}
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
    </Link>
  )
}
