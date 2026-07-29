import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Heart, LogOut, ChevronRight, Bell, Lock, Palette, HelpCircle, Leaf, Sprout, ShieldCheck, MessageCircle } from 'lucide-react'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getUserStats } from '@/lib/actions/profile'
import { listPendingSpecies } from '@/lib/actions/species'
import { getUnreadNotificationCount } from '@/lib/actions/notifications'
import { getOpenSupportMessageCount } from '@/lib/actions/support'
import { signOut } from '@/lib/actions/auth'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/map')

  const [profile, stats, unreadNotifications] = await Promise.all([
    getProfile(),
    getUserStats(user.id),
    getUnreadNotificationCount(),
  ])

  const [pendingSpecies, openSupportMessages] = profile?.is_admin
    ? await Promise.all([listPendingSpecies(), getOpenSupportMessageCount()])
    : [[], 0]

  return (
    <MobileShell>
      <PageHeader title="Perfil" showBack={false} />

      <div className="flex-1 overflow-y-auto">
        {/* Profile header */}
        <div className="flex flex-col items-center gap-3 bg-green-50 px-6 py-8 dark:bg-green-900/20">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name || user.email}
            size="xl"
          />
          <div className="text-center">
            <h2 className="font-bold text-gray-900 text-lg dark:text-gray-100">{profile?.full_name || 'Usuário'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {[
            { label: 'Registros', value: stats.occurrences },
            { label: 'Favoritos', value: stats.favorites },
            { label: 'Espécies', value: stats.species },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-4">
              <span className="text-xl font-bold text-green-700 dark:text-green-400">{value}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </div>
          ))}
        </div>

        <div className="p-4 flex flex-col gap-2">
          <Link
            href="/profile/notifications"
            className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Notificações</span>
            {unreadNotifications > 0 && (
              <Badge variant="red">{unreadNotifications} nova{unreadNotifications !== 1 ? 's' : ''}</Badge>
            )}
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </Link>

          {/* Favorites link */}
          <Link
            href="/profile/favorites"
            className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
              <Heart className="h-5 w-5 text-red-500 dark:text-red-400" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Plantas favoritas</span>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </Link>

          <Link
            href="/map"
            className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
              <Leaf className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Meus registros no mapa</span>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </Link>

          <Link
            href="/profile/species"
            className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-900/30">
              <Sprout className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Ervas que sugeri</span>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </Link>

          <Link
            href="/profile/appearance"
            className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/30">
              <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Aparência</span>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </Link>

          <Link
            href="/profile/privacy"
            className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Lock className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Privacidade</span>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </Link>

          {profile?.is_admin && (
            <Link
              href="/admin/species"
              className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Moderação de ervas</span>
              {pendingSpecies.length > 0 && (
                <Badge variant="yellow">{pendingSpecies.length} pendente{pendingSpecies.length !== 1 ? 's' : ''}</Badge>
              )}
              <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </Link>
          )}

          {profile?.is_admin && (
            <Link
              href="/admin/support"
              className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Mensagens de suporte</span>
              {openSupportMessages > 0 && (
                <Badge variant="yellow">{openSupportMessages} aberta{openSupportMessages !== 1 ? 's' : ''}</Badge>
              )}
              <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </Link>
          )}

          <Link
            href="/profile/help"
            className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors shadow-sm dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <HelpCircle className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Ajuda e suporte</span>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </Link>

          {/* Sign out */}
          <form action={signOut} className="mt-2">
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
