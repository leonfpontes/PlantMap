'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, LayoutGrid, ShieldCheck, MessageCircle, Users, Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AdminPendingCounts {
  species: number
  support: number
  users: number
}

const NAV = [
  { href: '/admin', label: 'Visão geral', icon: LayoutGrid, key: 'overview' },
  { href: '/admin/species', label: 'Moderação de ervas', icon: ShieldCheck, key: 'species' },
  { href: '/admin/support', label: 'Suporte', icon: MessageCircle, key: 'support' },
  { href: '/admin/users', label: 'Usuários', icon: Users, key: 'users' },
] as const

/**
 * Casca da área administrativa: um painel único (rota /admin/*) em vez de
 * três telas soltas alcançadas cada uma pelo menu de perfil. No desktop, um
 * trilho escuro persistente sinaliza "modo backstage", separado do app
 * comum; no celular, vira um cabeçalho simples + abas roláveis. Os contadores
 * de pendência (que antes viviam espalhados no Sidebar do app) moram aqui,
 * junto do que eles de fato navegam.
 *
 * Os contadores chegam prontos do layout (servidor). Antes eram buscados aqui
 * num useEffect de dependência vazia, o que os deixava congelados na primeira
 * carga: aprovar uma erva tirava o card da fila mas o badge continuava
 * anunciando a pendência até o usuário recarregar a página na mão. Vindo do
 * servidor, um `router.refresh()` depois da ação já os traz corretos.
 */
export default function AdminShell({
  children,
  counts,
}: {
  children: React.ReactNode
  counts: AdminPendingCounts
}) {
  const pathname = usePathname()

  // 'overview' não tem contador próprio — é a soma das outras filas, e repetir
  // o número ali não ajudaria ninguém a decidir onde clicar.
  const countFor = (key: (typeof NAV)[number]['key']) => (key === 'overview' ? 0 : counts[key])
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))

  return (
    <div className="flex min-h-dvh w-full bg-[#f4f7f5] dark:bg-[#0d1611]">
      {/* Trilho — desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-shrink-0 lg:flex-col lg:px-3.5 lg:py-5">
        <Link
          href="/profile"
          className="mb-5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[#7f9a8c] transition-colors hover:bg-[#17301f] hover:text-[#d3e2d8]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao app
        </Link>
        <div className="mb-6 flex items-center gap-2.5 px-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-600">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-[10.5px] uppercase tracking-wide text-[#7f9a8c]">PlantMap</div>
            <div className="font-serif text-[15px] text-[#d3e2d8]">Administração</div>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon, key }) => {
            const active = isActive(href)
            const count = countFor(key)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13.5px] transition-colors',
                  active ? 'bg-[#17301f] text-white' : 'text-[#9db2a5] hover:bg-[#17301f] hover:text-[#d3e2d8]'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span className="rounded-full bg-yellow-500/90 px-1.5 py-0.5 text-[10.5px] font-semibold text-[#241a04]">
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho + abas — celular */}
        <div className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950 lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Administração</h1>
          </div>
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-2.5">
            {NAV.map(({ href, label, key }) => {
              const active = isActive(href)
              const count = countFor(key)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'bg-green-700 text-white dark:bg-green-600'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  )}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-[10px] font-semibold',
                        active ? 'bg-white/25' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-10">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
