'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Leaf, Map, Plus, Search, LogIn, ShieldCheck, MessageCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications'
import { listPendingSpecies } from '@/lib/actions/species'
import { getOpenSupportMessageCount } from '@/lib/actions/support'
import { getOpenPermissionRequestCount } from '@/lib/actions/permissions'
import { getProfile } from '@/lib/actions/profile'
import Avatar from '@/components/ui/Avatar'

/** Nav rail que substitui o BottomNav em telas largas (lg:+). Mesmos destinos, mais espaço. */
export default function Sidebar() {
  const pathname = usePathname()
  const { user, loading } = useUser()
  const unreadNotifications = useUnreadNotifications(user?.id || null)
  const { isAdmin } = useIsAdmin(user?.id || null)
  const [pendingSpeciesCount, setPendingSpeciesCount] = useState(0)
  const [openSupportCount, setOpenSupportCount] = useState(0)
  const [openPermissionCount, setOpenPermissionCount] = useState(0)
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    listPendingSpecies().then((list) => setPendingSpeciesCount(list.length))
    getOpenSupportMessageCount().then(setOpenSupportCount)
    getOpenPermissionRequestCount().then(setOpenPermissionCount)
  }, [isAdmin])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    getProfile().then((p) => setProfile(p ? { full_name: p.full_name, avatar_url: p.avatar_url } : null))
  }, [user])

  const active = (href: string) => (href === '/map' ? pathname === href : pathname.startsWith(href))

  return (
    <aside className="hidden shrink-0 flex-col border-r border-gray-100 bg-white px-4 py-6 lg:flex lg:w-64 dark:border-gray-800 dark:bg-gray-950">
      <Link href="/map" className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-700 dark:bg-green-600">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">PlantMap</span>
      </Link>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-gray-100 animate-pulse dark:bg-gray-800" />
          ))}
        </div>
      ) : !user ? (
        <nav className="flex flex-col gap-1">
          <SidebarItem href="/map" icon={Map} label="Mapa" active={active('/map')} />
          <SidebarItem href="/search" icon={Search} label="Buscar" active={active('/search')} />
          <SidebarItem href="/auth/login" icon={LogIn} label="Login" active={active('/auth/login')} />
        </nav>
      ) : (
        <nav className="flex flex-col gap-1">
          <SidebarItem href="/map" icon={Map} label="Mapa" active={active('/map')} />
          <SidebarItem href="/plant/register" icon={Plus} label="Registrar" active={active('/plant/register')} />
          <SidebarItem href="/search" icon={Search} label="Buscar" active={active('/search')} />
        </nav>
      )}

      {isAdmin && (
        <>
          <div className="my-4 border-t border-gray-100 dark:border-gray-800" />
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Administração
          </p>
          <nav className="flex flex-col gap-1">
            <SidebarItem
              href="/admin/species"
              icon={ShieldCheck}
              label="Moderação de ervas"
              active={active('/admin/species')}
              count={pendingSpeciesCount}
            />
            <SidebarItem
              href="/admin/support"
              icon={MessageCircle}
              label="Mensagens de suporte"
              active={active('/admin/support')}
              count={openSupportCount}
            />
            <SidebarItem
              href="/admin/users"
              icon={Users}
              label="Usuários"
              active={active('/admin/users')}
              count={openPermissionCount}
            />
          </nav>
        </>
      )}

      {user && (
        <Link
          href="/profile"
          className={cn(
            'mt-auto flex items-center gap-3 rounded-xl px-2 py-2 transition-colors',
            active('/profile')
              ? 'bg-green-50 dark:bg-green-900/30'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
        >
          <span className="relative flex-shrink-0">
            <Avatar src={profile?.avatar_url} name={profile?.full_name || user.email} size="sm" />
            {unreadNotifications > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-950" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn(
              'block truncate text-sm font-medium',
              active('/profile') ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
            )}>
              {profile?.full_name || 'Perfil'}
            </span>
            <span className="block truncate text-xs text-gray-400 dark:text-gray-500">{user.email}</span>
          </span>
        </Link>
      )}
    </aside>
  )
}

function SidebarItem({
  href, icon: Icon, label, active, count,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
  count?: number
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {!!count && count > 0 && (
        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
          {count}
        </span>
      )}
    </Link>
  )
}
