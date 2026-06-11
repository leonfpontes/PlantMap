'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Plus, Search, User, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/useUser'

export default function BottomNav() {
  const pathname = usePathname()
  const { user, loading } = useUser()

  const active = (href: string) =>
    href === '/map' ? pathname === href : pathname.startsWith(href)

  if (loading) {
    return (
      <nav className="flex-shrink-0 border-t border-gray-100 bg-white shadow-[0_-1px_8px_rgba(0,0,0,0.06)] h-14" />
    )
  }

  /* ── Visitante: Mapa | Buscar | Login ── */
  if (!user) {
    return (
      <nav className="flex-shrink-0 border-t border-gray-100 bg-white shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
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
    <nav className="flex-shrink-0 border-t border-gray-100 bg-white shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around px-2 pb-2 pt-1">

        <NavItem href="/map"     icon={Map}    label="Mapa"   active={active('/map')} />

        <NavItem href="/plant/register" icon={Plus} label="Registrar" active={active('/plant/register')} />

        <NavItem href="/search"  icon={Search} label="Buscar" active={active('/search')} />
        <NavItem href="/profile" icon={User}   label="Perfil" active={active('/profile')} />

      </div>
    </nav>
  )
}

function NavItem({
  href, icon: Icon, label, active,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 px-3 py-2">
      <Icon className={cn(
        'h-5 w-5 transition-colors',
        active ? 'text-green-700 stroke-[2.5]' : 'text-gray-400'
      )} />
      <span className={cn(
        'text-[10px] font-medium',
        active ? 'text-green-700' : 'text-gray-400'
      )}>
        {label}
      </span>
    </Link>
  )
}
