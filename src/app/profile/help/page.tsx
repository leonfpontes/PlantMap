import { redirect } from 'next/navigation'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import FaqAccordion from '@/components/profile/FaqAccordion'
import SupportMessageForm from '@/components/profile/SupportMessageForm'
import { createClient } from '@/lib/supabase/server'
import { listMySupportMessages } from '@/lib/actions/support'

export default async function HelpPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const myMessages = await listMySupportMessages()

  return (
    <MobileShell>
      <PageHeader title="Ajuda e suporte" />

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-8">
        <FaqAccordion />

        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Fale com a administração</h2>
          <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
            Não achou a resposta no FAQ acima? Escreva para a administração do terreiro — você recebe uma notificação assim que responderem.
          </p>
          <SupportMessageForm initialMessages={myMessages} />
        </section>
      </div>

      <BottomNav />
    </MobileShell>
  )
}
