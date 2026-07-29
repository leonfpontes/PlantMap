import { redirect } from 'next/navigation'
import MobileShell from '@/components/layout/MobileShell'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import SupportInbox from '@/components/admin/SupportInbox'
import { getProfile } from '@/lib/actions/profile'
import { listSupportMessages } from '@/lib/actions/support'

export default async function SupportInboxPage() {
  const profile = await getProfile()
  if (!profile) redirect('/auth/login')
  if (!profile.is_admin) redirect('/profile')

  const messages = await listSupportMessages()

  return (
    <MobileShell>
      <PageHeader title="Mensagens de suporte" />

      <div className="flex-1 overflow-y-auto p-4">
        <SupportInbox initialMessages={messages} />
      </div>

      <BottomNav />
    </MobileShell>
  )
}
