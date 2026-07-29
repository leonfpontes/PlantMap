import SupportInbox from '@/components/admin/SupportInbox'
import { listSupportMessages } from '@/lib/actions/support'

export default async function SupportInboxPage() {
  const messages = await listSupportMessages()

  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Administração</p>
      <h1 className="mb-2 font-serif text-2xl text-gray-900 dark:text-gray-100">Mensagens de suporte</h1>
      <p className="mb-6 max-w-prose text-sm text-gray-500 dark:text-gray-400">
        Abertas primeiro. Responder é opcional antes de marcar como resolvida.
      </p>
      <SupportInbox initialMessages={messages} />
    </div>
  )
}
