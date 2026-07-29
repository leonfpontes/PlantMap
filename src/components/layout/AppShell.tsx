'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

/**
 * Casca persistente do app: renderiza a Sidebar UMA vez no layout raiz, fora
 * de `{children}`, para que ela não pisque durante as trocas de rota — só o
 * conteúdo (children) é substituído pelo loading.tsx enquanto a página nova
 * busca dados (ver app/loading.tsx). Antes, cada página remontava sua
 * própria Sidebar dentro de MobileShell.
 *
 * /auth/* fica de fora: é a tela de entrada, com seu próprio layout
 * centralizado sem navegação nenhuma (nem BottomNav tinha lá).
 *
 * /admin/* também fica de fora: o AdminShell (ver app/admin/layout.tsx) é a
 * própria casca completa dali — trilho escuro persistente no desktop,
 * cabeçalho + abas no celular — em vez de aninhar dentro da Sidebar comum
 * do app.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith('/auth') || pathname.startsWith('/admin')) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-dvh w-full bg-gray-100 dark:bg-black lg:bg-gray-50 lg:dark:bg-gray-950">
      <Sidebar />
      {children}
    </div>
  )
}
