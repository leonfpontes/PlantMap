'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Plus, Search, User, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications'

export default function BottomNav() {
  const pathname = usePathname()
  const { user, loading } = useUser()
  const unreadNotifications = useUnreadNotifications(user?.id || null)

  const active = (href: string) =>
    href === '/map' ? pathname === href : pathname.startsWith(href)

  if (loading) {
    return (
      <nav className="flex-shrink-0 border-t border-gray-100 bg-white shadow-[0_-1px_8px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-950 h-14 lg:hidden" />
    )
  }

  /* ── Visitante: Mapa | Buscar | Login ── */
  /* Escondido em telas largas (lg:+): a Sidebar já cobre a mesma navegação lá. */
  if (!user) {
    return (
      <nav className="flex-shrink-0 border-t border-gray-100 bg-white shadow-[0_-1px_8px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-950 lg:hidden">
        <div className="flex items-center justify-around px-4 pb-2 pt-1">
          <NavItem href="/map"         icon={Map}   label="Mapa"   active={active('/map')} />
          <NavItem href="/search"      icon={Search} label="Buscar" active={active('/search')} />
          <NavItem href="/auth/login"  icon={LogIn}  label="Login"  active={active('/auth/login')} />
        </div>
      </nav>
    )
  }

  /* ── Autenticado: Mapa | Registrar (FAB) | Buscar | Perfil ── */
  return (
    <nav className="flex-shrink-0 border-t border-gray-100 bg-white shadow-[0_-1px_8px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-950 lg:hidden">
      <div className="flex items-center justify-around px-2 pb-2 pt-1">

        <NavItem href="/map"     icon={Map}    label="Mapa"   active={active('/map')} />

        <NavItem href="/plant/register" icon={Plus} label="Registrar" active={active('/plant/register')} />

        <NavItem href="/search"  icon={Search} label="Buscar" active={active('/search')} />
        <NavItem href="/profile" icon={User}   label="Perfil" active={active('/profile')} badge={unreadNotifications > 0} />

      </div>
    </nav>
  )
}

function NavItem({
  href, icon: Icon, label, active, badge,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
  badge?: boolean
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 px-3 py-2">
      <span className="relative">
        <Icon className={cn(
          'h-5 w-5 transition-colors',
          active ? 'text-green-700 dark:text-green-400 stroke-[2.5]' : 'text-gray-400 dark:text-gray-500'
        )} />
        {badge && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-950" />
        )}
      </span>
      <span className={cn(
        'text-[10px] font-medium',
        active ? 'text-green-700 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
      )}>
        {label}
      </span>
    </Link>
  )
}
