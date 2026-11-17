'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Plus, Search, User, LogIn, Trophy } from 'lucide-react'
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
        <div className="flex items-center justify-around px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          <NavItem href="/map"         icon={Map}   label="Mapa"   active={active('/map')} />
          <NavItem href="/search"      icon={Search} label="Buscar" active={active('/search')} />
          <NavItem href="/auth/login"  icon={LogIn}  label="Login"  active={active('/auth/login')} />
        </div>
      </nav>
    )
  }

  /* ── Autenticado: Mapa | Buscar | Nova planta (FAB) | Ranking | Perfil ── */
  return (
    <nav className="flex-shrink-0 border-t border-gray-100 bg-white shadow-[0_-1px_8px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-950 lg:hidden">
      <div className="flex items-end justify-around px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">

        <NavItem href="/map"     icon={Map}    label="Mapa"   active={active('/map')} />
        <NavItem href="/search"  icon={Search} label="Buscar" active={active('/search')} />

        <Link href="/plant/register" className="z-10 -mt-7 flex flex-col items-center gap-1 px-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-700 shadow-lg shadow-green-700/30 ring-4 ring-white dark:bg-green-600 dark:shadow-green-600/30 dark:ring-gray-950">
            <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
          </span>
          <span className={cn(
            'text-[11px] font-medium',
            active('/plant/register') ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
          )}>
            Nova planta
          </span>
        </Link>

        <NavItem href="/profile/ranking" icon={Trophy} label="Ranking" active={active('/profile/ranking')} />
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
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="flex min-w-14 flex-col items-center gap-0.5 px-2 py-1.5"
    >
      {/* Pílula atrás do ícone ativo: a cor sozinha era sutil demais pra dizer onde se está. */}
      <span className={cn(
        'relative flex h-7 w-12 items-center justify-center rounded-full transition-colors',
        active && 'bg-green-100 dark:bg-green-900/40'
      )}>
        <Icon className={cn(
          'h-5 w-5 transition-colors',
          active ? 'text-green-700 dark:text-green-400 stroke-[2.5]' : 'text-gray-500 dark:text-gray-400'
        )} />
        {badge && (
          <span className="absolute right-2.5 top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-950" aria-label="Notificações não lidas" />
        )}
      </span>
      <span className={cn(
        'text-[11px] font-medium',
        active ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
      )}>
        {label}
      </span>
    </Link>
  )
}
