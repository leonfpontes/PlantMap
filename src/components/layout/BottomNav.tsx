'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Plus, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/map', icon: Map, label: 'Mapa' },
  { href: '/plant/register', icon: Plus, label: 'Registrar' },
  { href: '/search', icon: Search, label: 'Buscar' },
  { href: '/profile', icon: User, label: 'Perfil' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-shrink-0 border-t border-gray-200 bg-white">
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/map' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 text-xs font-medium transition-colors',
                active ? 'text-green-700' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
