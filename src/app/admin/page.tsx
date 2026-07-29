import Link from 'next/link'
import { Leaf, MessageCircle, Sparkles, ArrowRight } from 'lucide-react'
import AdminReviewCard from '@/components/admin/AdminReviewCard'
import Avatar from '@/components/ui/Avatar'
import { listPendingSpecies } from '@/lib/actions/species'
import { listSupportMessages } from '@/lib/actions/support'
import { listAllUsers } from '@/lib/actions/permissions'
import { formatRelativeTime } from '@/lib/utils'

/**
 * Visão geral: junta o que está pendente nos 3 domínios (ervas, suporte,
 * usuários) numa única fila de triagem, mais recente primeiro. É só um
 * resumo — cada card leva pra tela do domínio, que tem a ação completa
 * (aprovar/rejeitar/responder). Evita repetir aquela lógica pela 3ª vez aqui.
 */
export default async function AdminOverviewPage() {
  const [pendingSpecies, supportMessages, users] = await Promise.all([
    listPendingSpecies(),
    listSupportMessages(),
    listAllUsers(),
  ])

  const openSupport = supportMessages.filter((m) => m.status === 'open')
  const pendingUsers = users.filter((u) => u.latest_request?.status === 'pending')

  const queue = [
    ...pendingSpecies.map((sp) => ({
      key: `species-${sp.id}`,
      createdAt: sp.created_at,
      href: '/admin/species',
      avatar: (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
          <Leaf className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
      ),
      title: sp.common_name,
      subtitle: sp.scientific_name || undefined,
      message: sp.description || undefined,
      domainLabel: 'Erva sugerida',
      domainVariant: 'green' as const,
      footerNote: `Sugerido por ${sp.submitter?.full_name || sp.submitter?.email || 'usuário removido'}`,
    })),
    ...openSupport.map((m) => ({
      key: `support-${m.id}`,
      createdAt: m.created_at,
      href: '/admin/support',
      avatar: (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
          <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
      ),
      title: m.subject,
      subtitle: undefined,
      message: m.message,
      domainLabel: 'Suporte',
      domainVariant: 'blue' as const,
      footerNote: undefined,
    })),
    ...pendingUsers.map((u) => ({
      key: `user-${u.id}`,
      createdAt: u.latest_request!.created_at,
      href: '/admin/users',
      avatar: <Avatar src={u.avatar_url} name={u.full_name} size="sm" />,
      title: u.full_name || u.email,
      subtitle: u.full_name ? u.email : undefined,
      message: u.latest_request!.message || undefined,
      domainLabel: 'Pedido de permissão',
      domainVariant: 'yellow' as const,
      footerNote: undefined,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Administração</p>
      <h1 className="mb-2 font-serif text-2xl text-gray-900 dark:text-gray-100">Visão geral</h1>
      <p className="mb-6 max-w-prose text-sm text-gray-500 dark:text-gray-400">
        Tudo que está esperando uma decisão, das três filas, mais antigo primeiro. Cada card leva
        para a tela do assunto, onde dá pra aprovar, rejeitar ou responder.
      </p>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
            <Sparkles className="h-8 w-8 text-green-500 dark:text-green-400" />
          </div>
          <p className="font-medium text-gray-600 dark:text-gray-300">Tudo em dia</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Nenhuma erva, mensagem ou pedido pendente agora</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {queue.map((item) => (
            <Link key={item.key} href={item.href} className="block">
              <AdminReviewCard
                avatar={item.avatar}
                title={item.title}
                subtitle={item.subtitle}
                meta={formatRelativeTime(item.createdAt)}
                pills={[{ label: item.domainLabel, variant: item.domainVariant }]}
                message={item.message}
                footer={
                  <div className="flex items-center justify-between gap-2">
                    {item.footerNote ? (
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-400 dark:text-gray-500">{item.footerNote}</span>
                    ) : <span />}
                    <span className="flex flex-shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-green-700 dark:text-green-400">
                      Ver e revisar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                }
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
